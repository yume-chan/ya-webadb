import { AdbBufferedStream, AdbNoneSubprocessProtocol, DecodeUtf8Stream, InspectStream, TransformStream, WritableStream, type Adb, type AdbSocket, type AdbSubprocessProtocol, type ReadableStream, type WritableStreamDefaultWriter } from '@yume-chan/adb';
import { EventEmitter } from '@yume-chan/event';
import Struct from '@yume-chan/struct';
import { AndroidMotionEventAction, ScrcpyControlMessageType, ScrcpyInjectKeyCodeControlMessage, ScrcpyInjectTextControlMessage, ScrcpyInjectTouchControlMessage, type AndroidKeyEventAction } from './message.js';
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

const ClipboardMessage =
    new Struct()
        .uint32('length')
        .string('content', { lengthField: 'length' });

export class ScrcpyClient {
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
                    protocols: [AdbNoneSubprocessProtocol],
                }
            );

            const result = await Promise.race([
                process.exit,
                connection.getStreams(),
            ]);

            if (typeof result === 'number') {
                throw new Error('scrcpy server exited prematurely');
            }

            const [videoStream, controlStream] = result;
            return new ScrcpyClient(adb, options, process, videoStream, controlStream);
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
        videoStream: AdbBufferedStream,
        controlStream: AdbSocket | undefined,
    ) {
        this._adb = adb;
        this.options = options;
        this.process = process;

        this._stdout = process.stdout
            .pipeThrough(new DecodeUtf8Stream())
            .pipeThrough(new TransformStream({
                transform(chunk, controller) {
                    for (const line of splitLines(chunk)) {
                        if (line === '') {
                            continue;
                        }
                        controller.enqueue(line);
                    }
                },
            }));

        this._videoStream = options
            .parseVideoStream(videoStream)
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

    public async injectKeyCode(message: Omit<ScrcpyInjectKeyCodeControlMessage, 'type'>) {
        const controlStream = this.checkControlStream('injectKeyCode');

        await controlStream.write(ScrcpyInjectKeyCodeControlMessage.serialize({
            ...message,
            type: ScrcpyControlMessageType.InjectKeycode,
        }));
    }

    public async injectText(text: string) {
        const controlStream = this.checkControlStream('injectText');

        await controlStream.write(ScrcpyInjectTextControlMessage.serialize({
            type: ScrcpyControlMessageType.InjectText,
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
            type: ScrcpyControlMessageType.InjectTouch,
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
            type: ScrcpyControlMessageType.InjectScroll,
            screenWidth: this.screenWidth,
            screenHeight: this.screenHeight,
        });
        await controlStream.write(buffer);
    }

    public async pressBackOrTurnOnScreen(action: AndroidKeyEventAction) {
        const controlStream = this.checkControlStream('pressBackOrTurnOnScreen');

        const buffer = this.options!.serializeBackOrScreenOnControlMessage({
            type: ScrcpyControlMessageType.BackOrScreenOn,
            action,
        });
        if (buffer) {
            await controlStream.write(buffer);
        }
    }

    public async close() {
        // No need to close streams. Kill the process will destroy them from the other side.
        await this.process?.kill();
    }
}
