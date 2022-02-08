import { Adb, AdbBufferedStream, AdbLegacyShell, AdbShell, DataEventEmitter } from '@yume-chan/adb';
import { PromiseResolver } from '@yume-chan/async';
import { EventEmitter } from '@yume-chan/event';
import Struct from '@yume-chan/struct';
import type { H264EncodingInfo } from "./decoder";
import { type AndroidKeyEventAction, AndroidMotionEventAction, ScrcpyControlMessageType, ScrcpyInjectKeyCodeControlMessage, ScrcpyInjectTextControlMessage, ScrcpyInjectTouchControlMessage } from './message';
import type { ScrcpyInjectScrollControlMessage1_22, ScrcpyOptions } from "./options";
import { pushServer, PushServerOptions } from "./push-server";
import { decodeUtf8 } from "./utils";

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
    public static pushServer(
        device: Adb,
        file: ArrayBuffer,
        options?: PushServerOptions
    ) {
        pushServer(device, file, options);
    }

    public static async getEncoders(
        device: Adb,
        path: string,
        version: string,
        options: ScrcpyOptions<any>
    ): Promise<string[]> {
        const resolver = new PromiseResolver<string[]>();
        const encoderNameRegex = options.getOutputEncoderNameRegex();
        const encoders: string[] = [];

        const client = new ScrcpyClient(device);
        client.onOutput((line) => {
            const match = line.match(encoderNameRegex);
            if (match) {
                encoders.push(match[1]!);
            }
        });

        client.onClose(() => {
            resolver.resolve(encoders);
        });

        // Provide an invalid encoder name
        // So the server will return all available encoders
        options.value.encoderName = '_';
        // Disable control for faster connection in 1.22+
        options.value.control = false;

        // Scrcpy server will open connections, before initializing encoder
        // Thus although an invalid encoder name is given, the start process will success
        await client.start(
            path,
            version,
            options
        );

        return resolver.promise;
    }

    private readonly device: Adb;

    public get backend() { return this.device.backend; }

    private process: AdbShell | undefined;

    private videoStream: AdbBufferedStream | undefined;

    private controlStream: AdbBufferedStream | undefined;

    private readonly outputEvent = new EventEmitter<string>();
    public get onOutput() { return this.outputEvent.event; }

    private readonly closeEvent = new EventEmitter<void>();
    public get onClose() { return this.closeEvent.event; }

    private _running = false;
    public get running() { return this._running; }

    private _screenWidth: number | undefined;
    public get screenWidth() { return this._screenWidth; }

    private _screenHeight: number | undefined;
    public get screenHeight() { return this._screenHeight; }

    private readonly encodingChangedEvent = new EventEmitter<H264EncodingInfo>();
    public get onEncodingChanged() { return this.encodingChangedEvent.event; }

    private readonly videoDataEvent = new DataEventEmitter<ArrayBuffer>();
    public get onVideoData() { return this.videoDataEvent.event; }

    private readonly clipboardChangeEvent = new EventEmitter<string>();
    public get onClipboardChange() { return this.clipboardChangeEvent.event; }

    private options: ScrcpyOptions<any> | undefined;
    private sendingTouchMessage = false;

    public constructor(device: Adb) {
        this.device = device;
    }

    public async start(
        path: string,
        version: string,
        options: ScrcpyOptions<any>
    ) {
        this.options = options;

        const connection = options.createConnection(this.device);
        let process: AdbShell | undefined;

        try {
            await connection.initialize();

            process = await this.device.childProcess.spawn(
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
                    shells: [AdbLegacyShell],
                }
            );

            process.onStdout(this.handleProcessOutput, this);

            const resolver = new PromiseResolver<never>();
            const removeExitListener = process.onExit(() => {
                resolver.reject(new Error('scrcpy server exited prematurely'));
            });

            const [videoStream, controlStream] = await Promise.race([
                resolver.promise,
                connection.getStreams(),
            ]);

            removeExitListener();
            this.process = process;
            this.process.onExit(this.handleProcessClosed, this);
            this.videoStream = videoStream;
            this.controlStream = controlStream;

            this._running = true;
            this.receiveVideo();
            this.receiveControl();
        } catch (e) {
            await process?.kill();
            throw e;
        } finally {
            connection.dispose();
        }
    }

    private handleProcessOutput(data: ArrayBuffer) {
        const text = decodeUtf8(data);
        for (const line of splitLines(text)) {
            if (line === '') {
                continue;
            }
            this.outputEvent.fire(line);
        }
    }

    private handleProcessClosed() {
        this._running = false;
        this.closeEvent.fire();
    }

    private async receiveVideo() {
        if (!this.videoStream) {
            throw new Error('receiveVideo started before initialization');
        }

        try {
            while (this._running) {
                const { encodingInfo, videoData } = await this.options!.parseVideoStream(this.videoStream);
                if (encodingInfo) {
                    this._screenWidth = encodingInfo.croppedWidth;
                    this._screenHeight = encodingInfo.croppedHeight;
                    this.encodingChangedEvent.fire(encodingInfo);
                }
                if (videoData) {
                    this.videoDataEvent.fire(videoData);
                }
            }
        } catch (e) {
            if (!this._running) {
                return;
            }
        }
    }

    private async receiveControl() {
        if (!this.controlStream) {
            // control disabled
            return;
        }

        try {
            while (true) {
                const type = await this.controlStream.read(1);
                switch (new Uint8Array(type)[0]) {
                    case 0:
                        const { content } = await ClipboardMessage.deserialize(this.controlStream);
                        this.clipboardChangeEvent.fire(content!);
                        break;
                    default:
                        throw new Error('unknown control message type');
                }
            }
        } catch (e) {
            if (!this._running) {
                return;
            }
        }
    }

    private checkControlStream(caller: string) {
        if (!this._running) {
            throw new Error(`${caller} called before start`);
        }

        if (!this.controlStream) {
            throw new Error(`${caller} called with control disabled`);
        }

        return this.controlStream;
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
        if (this.sendingTouchMessage &&
            (message.action === AndroidMotionEventAction.Move ||
                message.action === AndroidMotionEventAction.HoverMove)) {
            return;
        }

        this.sendingTouchMessage = true;
        await controlStream.write(ScrcpyInjectTouchControlMessage.serialize({
            ...message,
            type: ScrcpyControlMessageType.InjectTouch,
            screenWidth: this.screenWidth,
            screenHeight: this.screenHeight,
        }));
        this.sendingTouchMessage = false;
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
        if (!this._running) {
            return;
        }

        this._running = false;

        this.videoStream?.close();
        this.videoStream = undefined;

        this.controlStream?.close();
        this.controlStream = undefined;

        await this.process?.kill();
    }
}
