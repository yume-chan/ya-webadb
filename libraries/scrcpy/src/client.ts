import { Adb, AdbBufferedStream, AdbLegacyShell, AdbShell, DataEventEmitter } from '@yume-chan/adb';
import { PromiseResolver } from '@yume-chan/async';
import { EventEmitter } from '@yume-chan/event';
import Struct from '@yume-chan/struct';
import { ScrcpyClientConnection } from "./connection";
import { AndroidKeyEventAction, AndroidMotionEventAction, ScrcpyControlMessageType, ScrcpyInjectKeyCodeControlMessage, ScrcpyInjectScrollControlMessage, ScrcpyInjectTextControlMessage, ScrcpyInjectTouchControlMessage } from './message';
import { ScrcpyOptions } from "./options";
import { pushServer, PushServerOptions } from "./push-server";
import { parse_sequence_parameter_set, SequenceParameterSet } from './sps';
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

const Size =
    new Struct()
        .uint16('width')
        .uint16('height');

const VideoPacket =
    new Struct()
        .int64('pts')
        .uint32('size')
        .arrayBuffer('data', { lengthField: 'size' });

export const NoPts = BigInt(-1);

export type VideoPacket = typeof VideoPacket['TDeserializeResult'];

const ClipboardMessage =
    new Struct()
        .uint32('length')
        .string('content', { lengthField: 'length' });

export interface FrameSize {
    sequenceParameterSet: SequenceParameterSet;

    width: number;
    height: number;

    cropLeft: number;
    cropRight: number;

    cropTop: number;
    cropBottom: number;

    croppedWidth: number;
    croppedHeight: number;
}

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
        options: ScrcpyOptions
    ): Promise<string[]> {
        const client = new ScrcpyClient(device);
        const encoderNameRegex = options.getOutputEncoderNameRegex();

        const resolver = new PromiseResolver<string[]>();
        const encoders: string[] = [];
        client.onOutput((line) => {
            const match = line.match(encoderNameRegex);
            if (match) {
                encoders.push(match[1]!);
            }
        });

        client.onClose(() => {
            resolver.resolve(encoders);
        });

        // Scrcpy server will open connections, before initializing encoder
        // Thus although an invalid encoder name is given, the start process will success
        await client.startCore(
            path,
            version,
            options.formatGetEncoderListArguments(),
            options.createConnection(device)
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

    private readonly sizeChangedEvent = new EventEmitter<FrameSize>();
    public get onSizeChanged() { return this.sizeChangedEvent.event; }

    private readonly videoDataEvent = new DataEventEmitter<VideoPacket>();
    public get onVideoData() { return this.videoDataEvent.event; }

    private readonly clipboardChangeEvent = new EventEmitter<string>();
    public get onClipboardChange() { return this.clipboardChangeEvent.event; }

    private options: ScrcpyOptions | undefined;
    private sendingTouchMessage = false;

    public constructor(device: Adb) {
        this.device = device;
    }

    private async startCore(
        path: string,
        version: string,
        serverArguments: string[],
        connection: ScrcpyClientConnection
    ): Promise<void> {
        let process: AdbShell | undefined;

        try {
            await connection.initialize();

            process = await this.device.childProcess.spawn(
                [
                    `CLASSPATH=${path}`,
                    'app_process',
                    /* unused */ '/',
                    'com.genymobile.scrcpy.Server',
                    version,
                    ...serverArguments
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

    public start(
        path: string,
        version: string,
        options: ScrcpyOptions
    ) {
        this.options = options;
        return this.startCore(
            path,
            version,
            options.formatServerArguments(),
            options.createConnection(this.device)
        );
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
            // Device name, we don't need it
            await this.videoStream.read(64);

            // Initial video size
            const { width, height } = await Size.deserialize(this.videoStream);
            this._screenWidth = width;
            this._screenHeight = height;

            let buffer: ArrayBuffer | undefined;
            while (this._running) {
                const { pts, data } = await VideoPacket.deserialize(this.videoStream);
                if (!data || data.byteLength === 0) {
                    continue;
                }

                if (pts === NoPts) {
                    const sequenceParameterSet = parse_sequence_parameter_set(data.slice(0));

                    const {
                        pic_width_in_mbs_minus1,
                        pic_height_in_map_units_minus1,
                        frame_mbs_only_flag,
                        frame_crop_left_offset,
                        frame_crop_right_offset,
                        frame_crop_top_offset,
                        frame_crop_bottom_offset,
                    } = sequenceParameterSet;
                    const width = (pic_width_in_mbs_minus1 + 1) * 16;
                    const height = (pic_height_in_map_units_minus1 + 1) * (2 - frame_mbs_only_flag) * 16;
                    const cropLeft = frame_crop_left_offset * 2;
                    const cropRight = frame_crop_right_offset * 2;
                    const cropTop = frame_crop_top_offset * 2;
                    const cropBottom = frame_crop_bottom_offset * 2;

                    const screenWidth = width - cropLeft - cropRight;
                    const screenHeight = height - cropTop - cropBottom;
                    this._screenWidth = screenWidth;
                    this._screenHeight = screenHeight;

                    this.sizeChangedEvent.fire({
                        sequenceParameterSet,
                        width,
                        height,
                        cropLeft: cropLeft,
                        cropRight: cropRight,
                        cropTop: cropTop,
                        cropBottom: cropBottom,
                        croppedWidth: screenWidth,
                        croppedHeight: screenHeight,
                    });

                    buffer = data;
                    continue;
                }

                let array: Uint8Array;
                if (buffer) {
                    array = new Uint8Array(buffer.byteLength + data!.byteLength);
                    array.set(new Uint8Array(buffer));
                    array.set(new Uint8Array(data!), buffer.byteLength);
                    buffer = undefined;
                } else {
                    array = new Uint8Array(data!);
                }

                await this.videoDataEvent.fire({
                    pts,
                    size: array.byteLength,
                    data: array.buffer,
                });
            }
        } catch (e) {
            if (!this._running) {
                return;
            }
        }
    }

    private async receiveControl() {
        if (!this.controlStream) {
            throw new Error('receiveControl started before initialization');
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

    public async injectKeyCode(message: Omit<ScrcpyInjectKeyCodeControlMessage, 'type'>) {
        if (!this.controlStream) {
            throw new Error('injectKeyCode called before initialization');
        }

        await this.controlStream.write(ScrcpyInjectKeyCodeControlMessage.serialize({
            ...message,
            type: ScrcpyControlMessageType.InjectKeycode,
        }));
    }

    public async injectText(text: string) {
        if (!this.controlStream) {
            throw new Error('injectText called before initialization');
        }

        await this.controlStream.write(ScrcpyInjectTextControlMessage.serialize({
            type: ScrcpyControlMessageType.InjectText,
            text,
        }));
    }

    public async injectTouch(message: Omit<ScrcpyInjectTouchControlMessage, 'type' | 'screenWidth' | 'screenHeight'>) {
        if (!this.controlStream) {
            throw new Error('injectTouch called before initialization');
        }

        if (!this.screenWidth || !this.screenHeight) {
            return;
        }

        // ADB streams are actually pretty low-bandwidth and laggy
        // Re-sample move events to avoid flooding the connection
        if (this.sendingTouchMessage &&
            message.action === AndroidMotionEventAction.Move) {
            return;
        }

        this.sendingTouchMessage = true;
        const buffer = ScrcpyInjectTouchControlMessage.serialize({
            ...message,
            type: ScrcpyControlMessageType.InjectTouch,
            screenWidth: this.screenWidth,
            screenHeight: this.screenHeight,
        });
        await this.controlStream.write(buffer);
        this.sendingTouchMessage = false;
    }

    public async injectScroll(message: Omit<ScrcpyInjectScrollControlMessage, 'type' | 'screenWidth' | 'screenHeight'>) {
        if (!this.controlStream) {
            throw new Error('injectScroll called before initialization');
        }

        if (!this.screenWidth || !this.screenHeight) {
            return;
        }

        const buffer = ScrcpyInjectScrollControlMessage.serialize({
            ...message,
            type: ScrcpyControlMessageType.InjectScroll,
            screenWidth: this.screenWidth,
            screenHeight: this.screenHeight,
        });
        await this.controlStream.write(buffer);
    }

    public async pressBackOrTurnOnScreen(action: AndroidKeyEventAction) {
        if (!this.controlStream) {
            throw new Error('pressBackOrTurnOnScreen called before initialization');
        }

        const buffer = this.options!.createBackOrScreenOnEvent(action, this.device);
        if (buffer) {
            await this.controlStream.write(buffer);
        }
    }

    public async close() {
        if (!this._running) {
            return;
        }

        this._running = false;
        this.videoStream?.close();
        this.controlStream?.close();
        await this.process?.kill();
    }
}
