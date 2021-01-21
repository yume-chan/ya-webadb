import { Adb, AdbBufferedStream, AdbSocket, DataEventEmitter, EventQueue } from '@yume-chan/adb';
import { PromiseResolver } from '@yume-chan/async-operation-manager';
import { DisposableList, EventEmitter } from '@yume-chan/event';
import Struct from '@yume-chan/struct';
import { AndroidCodecLevel, AndroidCodecProfile } from './codec';
import { AndroidKeyEventAction, AndroidMotionEventAction, ScrcpyControlMessageType, ScrcpyInjectKeyCodeControlMessage, ScrcpyInjectTextControlMessage, ScrcpyInjectTouchControlMessage, ScrcpySimpleControlMessage } from './message';
import { parse_sequence_parameter_set } from './sps';

const encoderRegex = /^\s+scrcpy --encoder-name '(.*?)'/;

export enum ScrcpyLogLevel {
    Debug = 'debug',
    Info = 'info',
    Warn = 'warn',
    Error = 'error',
}

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

export enum ScrcpyScreenOrientation {
    Unlocked = -1,
    Portrait = 0,
    Landscape = 1,
    PortraitFlipped = 2,
    LandscapeFlipped = 3,
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

export interface ScrcpyStartOptions {
    device: Adb;

    path: string;

    version: string;

    logLevel?: ScrcpyLogLevel;

    maxSize?: number;

    bitRate: number;

    maxFps?: number;

    /**
     * The orientation of the video stream.
     *
     * It will not keep the device screen in specific orientation,
     * only the captured video will in this orientation.
     */
    orientation?: ScrcpyScreenOrientation;

    profile?: AndroidCodecProfile;

    level?: AndroidCodecLevel;

    encoder?: string;

    onInfo?: (message: string) => void;

    onError?: (message: ScrcpyOutput) => void;

    onClose?: () => void;
}

interface FrameSize {
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
    public static async start({
        device,
        path,
        version,
        logLevel = ScrcpyLogLevel.Error,
        maxSize = 0,
        bitRate,
        maxFps = 0,
        orientation = ScrcpyScreenOrientation.Unlocked,
        profile = AndroidCodecProfile.Baseline,
        level = AndroidCodecLevel.Level4,
        encoder = '-',
        onInfo,
        onError,
        onClose,
    }: ScrcpyStartOptions): Promise<ScrcpyClient> {
        const streams = new EventQueue<AdbSocket>();
        const reverseRegistry = await device.reverse.add('localabstract:scrcpy', 27183, {
            onSocket(packet, stream) {
                streams.enqueue(stream);
            },
        });

        const process = await device.spawn(
            `CLASSPATH=${path}`,
            'app_process',
            /*          unused */ '/',
            'com.genymobile.scrcpy.Server',
            version,
            logLevel,
            maxSize.toString(), // (0: unlimited)
            bitRate.toString(),
            maxFps.toString(),
            orientation.toString(),
            /*  tunnel_forward */ 'false',
            /*            crop */ '-',
            /* send_frame_meta */ 'true', // always send frame meta (packet boundaries + timestamp)
            /*         control */ 'true',
            /*      display_id */ '0',
            /*    show_touches */ 'false',
            /*      stay_awake */ 'true',
            /*   codec_options */ `profile=${profile},level=${level}`,
            encoder,
        );

        const disposables = new DisposableList();
        // Dispatch messages before connection created
        disposables.add(process.onData(data => {
            const string = device.backend.decodeUtf8(data);
            for (const output of parseScrcpyOutput(string)) {
                switch (output.level) {
                    case ScrcpyLogLevel.Info:
                        onInfo?.(output.message);
                        break;
                    case ScrcpyLogLevel.Error:
                        onError?.(output);
                        break;
                }
            }
        }));

        if (onClose) {
            process.onClose(onClose);
        }

        const videoStream = new AdbBufferedStream(await streams.dequeue());
        const controlStream = new AdbBufferedStream(await streams.dequeue());

        // Don't await this!
        // `reverse.remove`'s response will never arrive
        // before we read all pending data from `videoStream`
        device.reverse.remove(reverseRegistry);

        // Stop dispatch messages
        disposables.dispose();

        const connection = new ScrcpyClient(
            process,
            videoStream,
            controlStream,
        );

        // Forward message handlers
        if (onInfo) {
            connection.onInfo(onInfo);
        }
        if (onError) {
            connection.onError(onError);
        }

        return connection;
    }

    public static async getEncoders(options: ScrcpyStartOptions): Promise<string[]> {
        // Make a copy
        options = { ...options };

        // Provide an invalid encoder name
        // So the server will return all available encoders
        options.encoder = '_';

        const encoders: string[] = [];
        options.onError = ({ message, error }) => {
            if (error && error.type !== 'com.genymobile.scrcpy.InvalidEncoderException') {
                resolver.reject(new Error(`${error.type}: ${error.message}`));
                return;
            }

            const match = message.match(encoderRegex);
            if (match) {
                encoders.push(match[1]);
            }
        };

        const resolver = new PromiseResolver<string[]>();
        options.onClose = () => {
            resolver.resolve(encoders);
        };

        await this.start(options);
        return resolver.promise;
    }

    private readonly process: AdbSocket;

    private readonly infoEvent = new EventEmitter<string>();
    public get onInfo() { return this.infoEvent.event; }

    private readonly errorEvent = new EventEmitter<ScrcpyOutput>();
    public get onError() { return this.errorEvent.event; }

    public get onClose() { return this.process.onClose; }

    private _running = true;
    public get running() { return this._running; }

    private _screenWidth: number | undefined;
    public get screenWidth() { return this._screenWidth; }

    private _screenHeight: number | undefined;
    public get screenHeight() { return this._screenHeight; }

    private readonly sizeChangedEvent = new EventEmitter<FrameSize>();
    public get onSizeChanged() { return this.sizeChangedEvent.event; }

    private readonly videoDataEvent = new DataEventEmitter<VideoPacket>();
    public get onVideoData() { return this.videoDataEvent.event; }

    private readonly videoStream: AdbBufferedStream;

    private readonly controlStream: AdbBufferedStream;

    private readonly clipboardChangeEvent = new EventEmitter<string>();
    public get onClipboardChange() { return this.clipboardChangeEvent.event; }

    private sendingTouchMessage = false;

    public constructor(
        process: AdbSocket,
        videoStream: AdbBufferedStream,
        controlStream: AdbBufferedStream
    ) {
        this.process = process;
        this.process.onData(this.handleProcessOutput, this);
        this.process.onClose(this.handleProcessClosed, this);

        this.videoStream = videoStream;
        this.controlStream = controlStream;

        this.receiveVideo();
        this.receiveControl();
    }

    private handleProcessOutput(data: ArrayBuffer) {
        const string = this.process.backend.decodeUtf8(data);
        for (const output of parseScrcpyOutput(string)) {
            switch (output.level) {
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
    }

    private async receiveVideo() {
        try {
            // Device name, we don't need it
            await this.videoStream.read(64);

            // Initial video size
            const { width, height } = await Size.deserialize(this.videoStream);
            this._screenWidth = width;
            this._screenHeight = height;
            this.sizeChangedEvent.fire({
                width,
                height,
                cropLeft: 0,
                cropRight: 0,
                cropTop: 0,
                cropBottom: 0,
                croppedWidth: width,
                croppedHeight: height,
            });

            let buffer: ArrayBuffer | undefined;
            while (this._running) {
                const { pts, data } = await VideoPacket.deserialize(this.videoStream);
                if (!data || data.byteLength === 0) {
                    continue;
                }

                if (pts === NoPts) {
                    const {
                        pic_width_in_mbs_minus1,
                        pic_height_in_map_units_minus1,
                        frame_mbs_only_flag,
                        frame_crop_left_offset,
                        frame_crop_right_offset,
                        frame_crop_top_offset,
                        frame_crop_bottom_offset,
                    } = parse_sequence_parameter_set(data.slice(0));

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
        await this.controlStream.write(ScrcpyInjectKeyCodeControlMessage.serialize({
            ...message,
            type: ScrcpyControlMessageType.InjectKeycode,
            action: AndroidKeyEventAction.Down,
        }, this.process.backend));

        await this.controlStream.write(ScrcpyInjectKeyCodeControlMessage.serialize({
            ...message,
            type: ScrcpyControlMessageType.InjectKeycode,
            action: AndroidKeyEventAction.Up,
        }, this.process.backend));
    }

    public async injectText(text: string) {
        await this.controlStream.write(ScrcpyInjectTextControlMessage.serialize({
            type: ScrcpyControlMessageType.InjectText,
            text,
        }, this.process.backend));
    }

    public async injectTouch(message: Omit<ScrcpyInjectTouchControlMessage, 'type' | 'screenWidth' | 'screenHeight'>) {
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
        }, this.process.backend);
        await this.controlStream.write(buffer);
        this.sendingTouchMessage = false;
    }

    public async pressBackOrTurnOnScreen() {
        const buffer = ScrcpySimpleControlMessage.serialize(
            { type: ScrcpyControlMessageType.BackOrScreenOn },
            this.process.backend
        );
        await this.controlStream.write(buffer);
    }

    public async close() {
        if (!this._running) {
            return;
        }

        this._running = false;
        this.videoStream.close();
        this.controlStream.close();
        await this.process.close();
    }
}
