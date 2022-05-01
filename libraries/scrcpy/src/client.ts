import { AbortController, AdbBufferedStream, AdbSubprocessNoneProtocol, DecodeUtf8Stream, InspectStream, ReadableStream, TransformStream, WritableStream, type Adb, type AdbSocket, type AdbSubprocessProtocol, type WritableStreamDefaultWriter } from '@yume-chan/adb';
import { EventEmitter } from '@yume-chan/event';
import Struct from '@yume-chan/struct';
import { AndroidMotionEventAction, ScrcpyControlMessageType, ScrcpyInjectKeyCodeControlMessage, ScrcpyInjectTextControlMessage, ScrcpyInjectTouchControlMessage, ScrcpySimpleControlMessage, type AndroidKeyEventAction } from './message.js';
import type { ScrcpyInjectScrollControlMessage1_22, ScrcpyOptions, VideoStreamPacket } from "./options/index.js";

function* splitLines(text: string): Generator<string, void, void> {
    let start = 0;

    while (true) {
        const index = text.indexOf('\n', start);
        if (index === -1) {
            return;
        }

        const line = text.substring(start, index);
        yield line;

        start = index + 1;
    }
}

class SplitLinesStream extends TransformStream<string, string>{
    constructor() {
        super({
            transform(chunk, controller) {
                for (const line of splitLines(chunk)) {
                    if (line === '') {
                        continue;
                    }
                    controller.enqueue(line);
                }
            },
        });
    }
}

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

const ClipboardMessage =
    new Struct()
        .uint32('length')
        .string('content', { lengthField: 'length' });

export class ScrcpyClient {
    /**
     * This method will modify the given `options`,
     * so don't reuse it elsewhere.
     */
    public static async getEncoders(
        adb: Adb,
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
        const client = await ScrcpyClient.start(adb, path, version, options);

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
        options: ScrcpyOptions<any>
    ): Promise<number[]> {
        // Similar to `getEncoders`, pass an invalid option and parse the output
        options.value.displayId = -1;

        options.value.control = false;
        options.value.sendDeviceMeta = false;
        options.value.sendDummyByte = false;

        try {
            // Server will exit before opening connections when an invalid display id was given.
            await ScrcpyClient.start(adb, path, version, options);
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

    public static async start(
        adb: Adb,
        path: string,
        version: string,
        options: ScrcpyOptions<any>
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
                    // Scrcpy server doesn't split stdout and stderr,
                    // so disable Shell Protocol to simplify processing
                    protocols: [AdbSubprocessNoneProtocol],
                }
            );

            const stdout = process.stdout
                .pipeThrough(new DecodeUtf8Stream())
                .pipeThrough(new SplitLinesStream());

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
                adb,
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

    private _adb: Adb;
    public get adb() { return this._adb; }

    private options: ScrcpyOptions<any>;
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

    private _controlStreamWriter: WritableStreamDefaultWriter<Uint8Array> | undefined;

    private readonly clipboardChangeEvent = new EventEmitter<string>();
    public get onClipboardChange() { return this.clipboardChangeEvent.event; }

    private lastTouchMessage = 0;

    public constructor(
        adb: Adb,
        options: ScrcpyOptions<any>,
        process: AdbSubprocessProtocol,
        stdout: ReadableStream<string>,
        videoStream: AdbSocket,
        controlStream: AdbSocket | undefined,
    ) {
        this._adb = adb;
        this.options = options;
        this.process = process;

        this._stdout = stdout;

        this._videoStream = videoStream.readable
            .pipeThrough(options.createVideoStreamTransformer())
            .pipeThrough(new InspectStream(packet => {
                if (packet.type === 'configuration') {
                    this._screenWidth = packet.data.croppedWidth;
                    this._screenHeight = packet.data.croppedHeight;
                }
            }));

        if (controlStream) {
            const buffered = new AdbBufferedStream(controlStream);
            this._controlStreamWriter = controlStream.writable.getWriter();
            (async () => {
                try {
                    while (true) {
                        const type = await buffered.read(1);
                        switch (type[0]) {
                            case 0:
                                const { content } = await ClipboardMessage.deserialize(buffered);
                                this.clipboardChangeEvent.fire(content!);
                                break;
                            default:
                                throw new Error('unknown control message type');
                        }
                    }
                } catch {
                    // TODO: Scrcpy: handle error
                }
            })();
        }
    }

    private checkControlStream(caller: string) {
        if (!this._controlStreamWriter) {
            throw new Error(`${caller} called with control disabled`);
        }

        return this._controlStreamWriter;
    }

    private getControlMessageTypeValue(type: ScrcpyControlMessageType) {
        const list = this.options.getControlMessageTypes();
        const index = list.indexOf(type);
        if (index === -1) {
            throw new Error('Not supported');
        }
        return index;
    }

    public async injectKeyCode(message: Omit<ScrcpyInjectKeyCodeControlMessage, 'type'>) {
        const controlStream = this.checkControlStream('injectKeyCode');

        await controlStream.write(ScrcpyInjectKeyCodeControlMessage.serialize({
            ...message,
            type: this.getControlMessageTypeValue(ScrcpyControlMessageType.InjectKeycode),
        }));
    }

    public async injectText(text: string) {
        const controlStream = this.checkControlStream('injectText');

        await controlStream.write(ScrcpyInjectTextControlMessage.serialize({
            type: this.getControlMessageTypeValue(ScrcpyControlMessageType.InjectText),
            text,
        }));
    }

    public async injectTouch(message: Omit<ScrcpyInjectTouchControlMessage, 'type' | 'screenWidth' | 'screenHeight'>) {
        const controlStream = this.checkControlStream('injectTouch');

        if (!this.screenWidth || !this.screenHeight) {
            return;
        }

        // ADB streams are actually pretty low-bandwidth and laggy
        // Re-sample move events to avoid flooding the connection

        // TODO: Scrcpy: investigate how to throttle touch events
        // because 60FPS may still be too high
        const now = Date.now();
        if (now - this.lastTouchMessage < 16 &&
            [AndroidMotionEventAction.Move, AndroidMotionEventAction.HoverMove].includes(message.action)) {
            return;
        }

        this.lastTouchMessage = now;
        await controlStream.write(ScrcpyInjectTouchControlMessage.serialize({
            ...message,
            type: this.getControlMessageTypeValue(ScrcpyControlMessageType.InjectTouch),
            screenWidth: this.screenWidth,
            screenHeight: this.screenHeight,
        }));
    }

    public async injectScroll(message: Omit<ScrcpyInjectScrollControlMessage1_22, 'type' | 'screenWidth' | 'screenHeight'>) {
        const controlStream = this.checkControlStream('injectScroll');

        if (!this.screenWidth || !this.screenHeight) {
            return;
        }

        const buffer = this.options!.serializeInjectScrollControlMessage({
            ...message,
            type: this.getControlMessageTypeValue(ScrcpyControlMessageType.InjectScroll),
            screenWidth: this.screenWidth,
            screenHeight: this.screenHeight,
        });
        await controlStream.write(buffer);
    }

    public async pressBackOrTurnOnScreen(action: AndroidKeyEventAction) {
        const controlStream = this.checkControlStream('pressBackOrTurnOnScreen');

        const buffer = this.options!.serializeBackOrScreenOnControlMessage({
            type: this.getControlMessageTypeValue(ScrcpyControlMessageType.BackOrScreenOn),
            action,
        });
        if (buffer) {
            await controlStream.write(buffer);
        }
    }

    private async sendSimpleControlMessage(type: ScrcpyControlMessageType, name: string) {
        const controlStream = this.checkControlStream(name);
        const buffer = ScrcpySimpleControlMessage.serialize({
            type: this.getControlMessageTypeValue(type),
        });
        await controlStream.write(buffer);
    }

    public async rotateDevice() {
        await this.sendSimpleControlMessage(ScrcpyControlMessageType.RotateDevice, 'rotateDevice');
    }

    public async close() {
        // No need to close streams. Kill the process will destroy them from the other side.
        await this.process?.kill();
    }
}
