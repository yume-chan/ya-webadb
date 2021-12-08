import { Adb, AdbBufferedStream, AdbLegacyShell, AdbShell, DataEventEmitter } from '@yume-chan/adb';
import { PromiseResolver } from '@yume-chan/async';
import { EventEmitter } from '@yume-chan/event';
import Struct from '@yume-chan/struct';
import { ScrcpyClientConnection } from "./connection";
import { AndroidKeyEventAction, AndroidMotionEventAction, ScrcpyControlMessageType, ScrcpyInjectKeyCodeControlMessage, ScrcpyInjectTextControlMessage, ScrcpyInjectTouchControlMessage, ScrcpySimpleControlMessage } from './message';
import { ScrcpyLogLevel, ScrcpyOptions } from "./options";
import { pushServer, PushServerOptions } from "./push-server";
import { parse_sequence_parameter_set, SequenceParameterSet } from './sps';

interface ScrcpyError {
    type: string;

    message: string;

    stackTrace: string[];
}

interface ScrcpyOutput {
    level: ScrcpyLogLevel;

    message: string;

    error?: ScrcpyError;
}

class LineReader {
    private readonly text: string;

    private start = 0;

    private peekLine: string | undefined;

    private peekEnd = 0;

    constructor(text: string) {
        this.text = text;
    }

    public next(): string | undefined {
        let result = this.peek();
        this.start = this.peekEnd;
        this.peekEnd = 0;
        return result;
    }

    public peek(): string | undefined {
        if (this.peekEnd) {
            return this.peekLine;
        }

        const index = this.text.indexOf('\n', this.start);
        if (index === -1) {
            this.peekLine = undefined;
            this.peekEnd = this.text.length;
            return undefined;
        }

        const line = this.text.substring(this.start, index);
        this.peekLine = line;
        this.peekEnd = index + 1;
        return line;
    }
}

function* parseScrcpyOutput(text: string): Generator<ScrcpyOutput> {
    const lines = new LineReader(text);
    let line: string | undefined;
    while (line = lines.next()) {
        if (line === '') {
            continue;
        }

        if (line.startsWith('[server] ')) {
            line = line.substring('[server] '.length);

            if (line.startsWith('DEBUG: ')) {
                yield {
                    level: ScrcpyLogLevel.Debug,
                    message: line.substring('DEBUG: '.length),
                };
                continue;
            }

            if (line.startsWith('INFO: ')) {
                yield {
                    level: ScrcpyLogLevel.Info,
                    message: line.substring('INFO: '.length),
                };
                continue;
            }

            if (line.startsWith('ERROR: ')) {
                line = line.substring('ERROR: '.length);
                const message = line;

                let error: ScrcpyError | undefined;
                if (line.startsWith('Exception on thread')) {
                    if (line = lines.next()) {
                        const [errorType, errorMessage] = line.split(': ', 2);
                        const stackTrace: string[] = [];
                        while (line = lines.peek()) {
                            if (line.startsWith('\t')) {
                                stackTrace.push(line.trim());
                                lines.next();
                                continue;
                            }
                            break;
                        }
                        error = {
                            type: errorType,
                            message: errorMessage,
                            stackTrace,
                        };
                    }
                }

                yield {
                    level: ScrcpyLogLevel.Error,
                    message,
                    error,
                };
                continue;
            }
        }

        yield {
            level: ScrcpyLogLevel.Info,
            message: line,
        };
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

    public static async getEncoders(device: Adb, options: ScrcpyOptions): Promise<string[]> {
        const client = new ScrcpyClient(device);
        const encoderNameRegex = options.getOutputEncoderNameRegex();

        const resolver = new PromiseResolver<string[]>();
        const encoders: string[] = [];
        client.onError(({ message, error }) => {
            if (error && error.type !== 'com.genymobile.scrcpy.InvalidEncoderException') {
                resolver.reject(new Error(`${error.type}: ${error.message}`));
                return;
            }

            const match = message.match(encoderNameRegex);
            if (match) {
                encoders.push(match[1]);
            }
        });

        client.onClose(() => {
            resolver.resolve(encoders);
        });

        // Scrcpy server will open connections, before initializing encoder
        // Thus although an invalid encoder name is given, the start process will success
        await client.startCore(
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

    private readonly debugEvent = new EventEmitter<string>();
    public get onDebug() { return this.debugEvent.event; }

    private readonly infoEvent = new EventEmitter<string>();
    public get onInfo() { return this.infoEvent.event; }

    private readonly errorEvent = new EventEmitter<ScrcpyOutput>();
    public get onError() { return this.errorEvent.event; }

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

    private sendingTouchMessage = false;

    public constructor(device: Adb) {
        this.device = device;
    }

    private async startCore(
        serverArguments: string[],
        connection: ScrcpyClientConnection
    ): Promise<void> {
        let process: AdbShell | undefined;

        try {
            await connection.initialize();

            process = await this.device.childProcess.spawn(
                serverArguments,
                {
                    // Disable Shell Protocol to simplify processing
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

    public start(options: ScrcpyOptions) {
        return this.startCore(
            options.formatServerArguments(),
            options.createConnection(this.device)
        );
    }

    private handleProcessOutput(data: ArrayBuffer) {
        const string = this.device.backend.decodeUtf8(data);
        for (const output of parseScrcpyOutput(string)) {
            switch (output.level) {
                case ScrcpyLogLevel.Debug:
                    this.debugEvent.fire(output.message);
                    break;
                case ScrcpyLogLevel.Info:
                    this.infoEvent.fire(output.message);
                    break;
                case ScrcpyLogLevel.Error:
                    this.errorEvent.fire(output);
                    break;
            }
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

    public async injectKeyCode(message: Omit<ScrcpyInjectKeyCodeControlMessage, 'type' | 'action'>) {
        if (!this.controlStream) {
            throw new Error('injectKeyCode called before initialization');
        }

        await this.controlStream.write(ScrcpyInjectKeyCodeControlMessage.serialize({
            ...message,
            type: ScrcpyControlMessageType.InjectKeycode,
            action: AndroidKeyEventAction.Down,
        }, this.backend));

        await this.controlStream.write(ScrcpyInjectKeyCodeControlMessage.serialize({
            ...message,
            type: ScrcpyControlMessageType.InjectKeycode,
            action: AndroidKeyEventAction.Up,
        }, this.backend));
    }

    public async injectText(text: string) {
        if (!this.controlStream) {
            throw new Error('injectText called before initialization');
        }

        await this.controlStream.write(ScrcpyInjectTextControlMessage.serialize({
            type: ScrcpyControlMessageType.InjectText,
            text,
        }, this.backend));
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
        }, this.backend);
        await this.controlStream.write(buffer);
        this.sendingTouchMessage = false;
    }

    public async pressBackOrTurnOnScreen() {
        if (!this.controlStream) {
            throw new Error('pressBackOrTurnOnScreen called before initialization');
        }

        const buffer = ScrcpySimpleControlMessage.serialize(
            { type: ScrcpyControlMessageType.BackOrScreenOn },
            this.backend
        );
        await this.controlStream.write(buffer);
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
