import { AdbCommandBase, AdbSubprocessNoneProtocol, AdbSubprocessProtocol, AdbSync } from '@yume-chan/adb';
import { DecodeUtf8Stream, ReadableStream, SplitStringStream, WrapWritableStream, WritableStream } from '@yume-chan/stream-extra';

import { ScrcpyClient } from './client.js';
import { DEFAULT_SERVER_PATH, type ScrcpyOptions } from './options/index.js';

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

export class AdbScrcpyClient extends AdbCommandBase {
    pushServer(
        path = DEFAULT_SERVER_PATH,
    ) {
        let sync!: AdbSync;
        return new WrapWritableStream<Uint8Array>({
            start: async () => {
                sync = await this.adb.sync();
                return sync.write(path);
            },
            async close() {
                await sync.dispose();
            },
        });
    }

    async start(
        path: string,
        version: string,
        options: ScrcpyOptions<any>
    ) {
        const connection = options.createConnection(this.adb);
        let process: AdbSubprocessProtocol | undefined;

        try {
            await connection.initialize();

            process = await this.adb.subprocess.spawn(
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
                    // Scrcpy server doesn't split stdout and stderr,
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
            return new ScrcpyClient(
                options,
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
    public async getEncoders(
        path: string,
        version: string,
        options: ScrcpyOptions<any>
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
        const client = await this.start(path, version, options);

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
    async getDisplays(
        path: string,
        version: string,
        options: ScrcpyOptions<any>
    ): Promise<number[]> {
        // Similar to `getEncoders`, pass an invalid option and parse the output
        options.value.displayId = -1;

        options.value.control = false;
        options.value.sendDeviceMeta = false;
        options.value.sendDummyByte = false;

        try {
            // Server will exit before opening connections when an invalid display id was given.
            await this.start(path, version, options);
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

}
