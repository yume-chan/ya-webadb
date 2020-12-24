import { Adb, AdbBufferedStream, AdbStream, EventQueue } from '@yume-chan/adb';
import { DisposableList, EventEmitter } from '@yume-chan/event';
import { Struct, StructValueType } from '@yume-chan/struct';
import { AndroidKeyEventAction, AndroidMotionEventAction, ScrcpyControlMessageType, ScrcpyInjectKeyCodeControlMessage, ScrcpyInjectTouchControlMessage, ScrcpySimpleControlMessage } from './message';

export enum ScrcpyLogLevel {
    Debug = 'debug',
    Info = 'info',
    Warn = 'warn',
    Error = 'error',
}

function* parseScrcpyOutput(message: string): Generator<{ level: ScrcpyLogLevel, message: string; }> {
    for (let line of message.split('\n')) {
        if (line === '') {
            continue;
        }

        if (line.startsWith('[server] ')) {
            line = line.substring('[server] '.length);

            if (line.startsWith('ERROR:')) {
                yield {
                    level: ScrcpyLogLevel.Error,
                    message: line.substring('ERROR: '.length),
                };
                continue;
            }

            if (line.startsWith('INFO:')) {
                yield {
                    level: ScrcpyLogLevel.Info,
                    message: line.substring('INFO: '.length),
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

// See https://developer.android.com/reference/android/media/MediaCodecInfo.CodecProfileLevel
export enum AndroidCodecProfile {
    Baseline = 0x01,
    Main = 0x02,
    Extended = 0x04,
    High = 0x08,
    High10 = 0x10,
    High422 = 0x20,
    High444 = 0x40,
    ConstrainedBaseline = 0x10000,
    ConstrainedHigh = 0x80000,
}

export enum AndroidCodecLevel {
    Level1 = 0x01,
    Level1b = 0x02,
    Level11 = 0x04,
    Level12 = 0x08,
    Level13 = 0x10,
    Level2 = 0x20,
    Level21 = 0x40,
    Level22 = 0x80,
    Level3 = 0x100,
    Level31 = 0x200,
    Level32 = 0x400,
    Level4 = 0x800,
    Level41 = 0x1000,
    Level42 = 0x2000,
    Level5 = 0x4000,
    Level51 = 0x8000,
    Level52 = 0x10000,
    Level6 = 0x20000,
    Level61 = 0x40000,
    Level62 = 0x80000,
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

export type VideoPacket = StructValueType<typeof VideoPacket>;

const ClipboardMessage =
    new Struct()
        .uint32('length')
        .string('content', { lengthField: 'length' });

export class ScrcpyConnection {
    private readonly process: AdbStream;

    private readonly infoEvent = new EventEmitter<string>();
    public get onInfo() { return this.infoEvent.event; }

    private readonly errorEvent = new EventEmitter<string>();
    public get onError() { return this.errorEvent.event; }

    private readonly closeEvent = new EventEmitter<void>();
    public get onClose() { return this.closeEvent.event; }

    private _running = true;
    public get running() { return this._running; }

    private _width: number | undefined;
    public get width() { return this._width; }

    private _height: number | undefined;
    public get height() { return this._height; }

    private readonly sizeChangedEvent = new EventEmitter<void>();
    public get onSizeChanged() { return this.sizeChangedEvent.event; }

    private readonly videoDataEvent = new EventEmitter<VideoPacket>();
    public get onVideoData() { return this.videoDataEvent.event; }

    private readonly videoStream: AdbBufferedStream;

    private readonly controlStream: AdbBufferedStream;

    private readonly clipboardChangeEvent = new EventEmitter<string>();
    public get onClipboardChange() { return this.clipboardChangeEvent.event; }

    private sendingTouchMessage = false;

    public constructor(
        process: AdbStream,
        videoStream: AdbBufferedStream,
        controlStream: AdbBufferedStream
    ) {
        if (process.closed) {
            throw new Error('Server has exited');
        }

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
        for (const { level, message } of parseScrcpyOutput(string)) {
            switch (level) {
                case ScrcpyLogLevel.Info:
                    this.infoEvent.fire(message);
                    break;
                case ScrcpyLogLevel.Error:
                    this.errorEvent.fire(message);
                    break;
            }
        }
    }

    private handleProcessClosed() {
        this._running = false;
        this.closeEvent.fire();
    }

    private async receiveVideo() {
        try {
            // Device name, we don't need it
            await this.videoStream.read(64);

            // Initial video size
            const { width, height } = await Size.deserialize(this.videoStream);
            this._width = width;
            this._height = height;
            this.sizeChangedEvent.fire();

            let buffer: ArrayBuffer | undefined;
            while (this._running) {
                const { pts, data } = await VideoPacket.deserialize(this.videoStream);
                if (data!.byteLength === 0) {
                    continue;
                }

                if (pts === NoPts) {
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

                this.videoDataEvent.fire({
                    pts,
                    size: array.byteLength,
                    data: array.buffer,
                });
            }
        } catch (e) {
            if (!this._running) {
                return;
            }

            this.close();
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

            this.close();
        }
    }

    public async injectKeyCode(message: ScrcpyInjectKeyCodeControlMessage) {
        const action = message.action;
        if (action & AndroidKeyEventAction.Down) {
            message.action = AndroidKeyEventAction.Down;
            const buffer = ScrcpyInjectKeyCodeControlMessage.serialize(message, this.process.backend);
            await this.controlStream.write(buffer);
        }
        if (action & AndroidKeyEventAction.Up) {
            message.action = AndroidKeyEventAction.Up;
            const buffer = ScrcpyInjectKeyCodeControlMessage.serialize(message, this.process.backend);
            await this.controlStream.write(buffer);
        }
    }

    public async injectTouch(message: ScrcpyInjectTouchControlMessage) {
        // ADB streams are actually pretty low-bandwidth and laggy
        // Re-sample move events to avoid flooding the connection
        if (this.sendingTouchMessage &&
            message.action === AndroidMotionEventAction.Move) {
            return;
        }

        this.sendingTouchMessage = true;
        const buffer = ScrcpyInjectTouchControlMessage.serialize(message, this.process.backend);
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
        await this.process.close();
    }
}

export interface ScrcpyOptions {
    device: Adb;

    path: string;

    version: string;

    logLevel?: ScrcpyLogLevel;

    maxSize?: number;

    bitRate: number;

    maxFps?: number;

    orientation?: ScrcpyScreenOrientation;

    profile?: AndroidCodecProfile;

    level?: AndroidCodecLevel;

    encoder?: string;

    onInfo?: (message: string) => void;

    onError?: (message: string) => void;

    onClose?: () => void;
}

export async function createScrcpyConnection(options: ScrcpyOptions) {
    const {
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
    } = options;

    const streams = new EventQueue<AdbStream>();
    const reverseRegistry = await device.reverse.add('localabstract:scrcpy', 27183, {
        onStream(packet, stream) {
            streams.push(stream);
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
        for (const { level, message } of parseScrcpyOutput(string)) {
            switch (level) {
                case ScrcpyLogLevel.Info:
                    onInfo?.(message);
                    break;
                case ScrcpyLogLevel.Error:
                    onError?.(message);
                    break;
            }
        }
    }));

    if (onClose) {
        disposables.add(process.onClose(onClose));
    }

    const videoStream = new AdbBufferedStream(await streams.next());
    const controlStream = new AdbBufferedStream(await streams.next());

    // Don't await this!
    // `reverse.remove`'s response will never arrive
    // before we read all pending data from `videoStream`
    device.reverse.remove(reverseRegistry);

    // Stop dispatch messages
    disposables.dispose();

    const connection = new ScrcpyConnection(
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
    if (onClose) {
        connection.onClose(onClose);
    }

    return connection;
}
