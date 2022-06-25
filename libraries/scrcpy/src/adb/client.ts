import { Adb, AdbSubprocessNoneProtocol, AdbSubprocessProtocol, AdbSync } from '@yume-chan/adb';
import { DecodeUtf8Stream, InspectStream, ReadableStream, SplitStringStream, WrapWritableStream, WritableStream, type ReadableWritablePair } from '@yume-chan/stream-extra';

import { ScrcpyControlMessageSerializer } from '../control/index.js';
import { ScrcpyDeviceMessageDeserializeStream, type ScrcpyDeviceMessage } from '../device-message/index.js';
import { DEFAULT_SERVER_PATH, type VideoStreamPacket } from '../options/index.js';
import type { AdbScrcpyOptions } from './options/index.js';

class ArrayToStream<T> extends ReadableStream<T>{
    private array!: T[];
    private index = 0;

    constructor(array: T[]) {
        super({
            start: async () => {
                await Promise.resolve();
                this.array = array;
            },
            pull: (controller) => {
                if (this.index < this.array.length) {
                    controller.enqueue(this.array[this.index]!);
                    this.index += 1;
                } else {
                    controller.close();
                }
            },
        });
    }
}

class ConcatStream<T> extends ReadableStream<T>{
    private streams!: ReadableStream<T>[];
    private index = 0;
    private reader!: ReadableStreamDefaultReader<T>;

    constructor(...streams: ReadableStream<T>[]) {
        super({
            start: async (controller) => {
                await Promise.resolve();

                this.streams = streams;
                this.advance(controller);
            },
            pull: async (controller) => {
                const result = await this.reader.read();
                if (!result.done) {
                    controller.enqueue(result.value);
                    return;
                }
                this.advance(controller);
            }
        });
    }

    private advance(controller: ReadableStreamDefaultController<T>) {
        if (this.index < this.streams.length) {
            this.reader = this.streams[this.index]!.getReader();
            this.index += 1;
        } else {
            controller.close();
        }
    }
}

export class AdbScrcpyClient {
    public static pushServer(
        adb: Adb,
        path = DEFAULT_SERVER_PATH,
    ) {
        let sync!: AdbSync;
        return new WrapWritableStream<Uint8Array>({
            async start() {
                sync = await adb.sync();
                return sync.write(path);
            },
            async close() {
                await sync.dispose();
            },
        });
    }

    public static async start(
        adb: Adb,
        path: string,
        version: string,
        options: AdbScrcpyOptions<any>
    ) {
        const connection = options.createConnection(adb);
        let process: AdbSubprocessProtocol | undefined;

        try {
            await connection.initialize();

            process = await adb.subprocess.spawn(
                [
                    // cspell: disable-next-line
                    `CLASSPATH=${path}`,
                    'app_process',
                    /* unused */ '/',
                    'com.genymobile.scrcpy.Server',
                    version,
                    ...options.formatServerArguments(),
                ],
                {
                    // Scrcpy server doesn't use stderr,
                    // so disable Shell Protocol to simplify processing
                    protocols: [AdbSubprocessNoneProtocol],
                }
            );

            const stdout = process.stdout
                .pipeThrough(new DecodeUtf8Stream())
                .pipeThrough(new SplitStringStream('\n'));

            // Read stdout, otherwise `process.exit` won't resolve.
            const output: string[] = [];
            const abortController = new AbortController();
            const pipe = stdout
                .pipeTo(new WritableStream({
                    write(chunk) {
                        output.push(chunk);
                    }
                }), {
                    signal: abortController.signal,
                    preventCancel: true,
                })
                .catch(() => { });

            const result = await Promise.race([
                process.exit,
                connection.getStreams(),
            ]);

            if (typeof result === 'number') {
                const error = new Error('scrcpy server exited prematurely');
                (error as any).output = output;
                throw error;
            }

            abortController.abort();
            await pipe;

            const [videoStream, controlStream] = result;
            return new AdbScrcpyClient(
                options,
                process,
                new ConcatStream(
                    new ArrayToStream(output),
                    stdout,
                ),
                videoStream,
                controlStream
            );
        } catch (e) {
            await process?.kill();
            throw e;
        } finally {
            connection.dispose();
        }
    }

    /**
     * This method will modify the given `options`,
     * so don't reuse it elsewhere.
     */
    public static async getEncoders(
        adb: Adb,
        path: string,
        version: string,
        options: AdbScrcpyOptions<any>
    ): Promise<string[]> {
        // Provide an invalid encoder name
        // So the server will return all available encoders
        options.value.encoderName = '_';
        // Disable control for faster connection in 1.22+
        options.value.control = false;
        options.value.sendDeviceMeta = false;
        options.value.sendDummyByte = false;

        // Scrcpy server will open connections, before initializing encoder
        // Thus although an invalid encoder name is given, the start process will success
        const client = await AdbScrcpyClient.start(
            adb,
            path,
            version,
            options
        );

        const encoderNameRegex = options.getOutputEncoderNameRegex();
        const encoders: string[] = [];
        await client.stdout.pipeTo(new WritableStream({
            write(line) {
                const match = line.match(encoderNameRegex);
                if (match) {
                    encoders.push(match[1]!);
                }
            },
        }));

        return encoders;
    }

    /**
     * This method will modify the given `options`,
     * so don't reuse it elsewhere.
     */
    public static async getDisplays(
        adb: Adb,
        path: string,
        version: string,
        options: AdbScrcpyOptions<any>
    ): Promise<number[]> {
        // Similar to `getEncoders`, pass an invalid option and parse the output
        options.value.displayId = -1;

        options.value.control = false;
        options.value.sendDeviceMeta = false;
        options.value.sendDummyByte = false;

        try {
            // Server will exit before opening connections when an invalid display id was given.
            await AdbScrcpyClient.start(adb, path, version, options);
        } catch (e) {
            if (e instanceof Error) {
                const output = (e as any).output as string[];

                const displayIdRegex = /\s+scrcpy --display (\d+)/;
                const displays: number[] = [];
                for (const line of output) {
                    const match = line.match(displayIdRegex);
                    if (match) {
                        displays.push(Number.parseInt(match[1]!, 10));
                    }
                }
                return displays;
            }
        }

        throw new Error('failed to get displays');
    }

    private process: AdbSubprocessProtocol;

    private _stdout: ReadableStream<string>;
    public get stdout() { return this._stdout; }

    public get exit() { return this.process.exit; }

    private _screenWidth: number | undefined;
    public get screenWidth() { return this._screenWidth; }

    private _screenHeight: number | undefined;
    public get screenHeight() { return this._screenHeight; }

    private _videoStream: ReadableStream<VideoStreamPacket>;
    public get videoStream() { return this._videoStream; }

    private _controlMessageSerializer: ScrcpyControlMessageSerializer | undefined;
    public get controlMessageSerializer() { return this._controlMessageSerializer; }

    private _deviceMessageStream: ReadableStream<ScrcpyDeviceMessage> | undefined;
    public get deviceMessageStream() { return this._deviceMessageStream; }

    public constructor(
        options: AdbScrcpyOptions<any>,
        process: AdbSubprocessProtocol,
        stdout: ReadableStream<string>,
        videoStream: ReadableStream<Uint8Array>,
        controlStream: ReadableWritablePair<Uint8Array, Uint8Array> | undefined,
    ) {
        this.process = process;
        this._stdout = stdout;

        this._videoStream = videoStream
            .pipeThrough(options.createVideoStreamTransformer())
            .pipeThrough(new InspectStream(packet => {
                if (packet.type === 'configuration') {
                    this._screenWidth = packet.data.croppedWidth;
                    this._screenHeight = packet.data.croppedHeight;
                }
            }));

        if (controlStream) {
            this._controlMessageSerializer = new ScrcpyControlMessageSerializer(controlStream.writable, options);
            this._deviceMessageStream = controlStream.readable.pipeThrough(new ScrcpyDeviceMessageDeserializeStream());
        }
    }

    public async close() {
        await this.process.kill();
    }
}
