import { EventQueue, AdbStream, AdbBufferedStream, Adb } from '@yume-chan/adb';
import { EventEmitter } from '@yume-chan/event';
import { Struct, StructValueType } from '@yume-chan/struct';
import { ScrcpyInjectTouchControlMessage } from './message';

export enum ScrcpyLogLevel {
    Debug = 'debug',
    Info = 'info',
    Warn = 'warn',
    Error = 'error',
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

export interface ScrcpyOptions {
    device: Adb;

    path: string;

    version: string;

    logLevel?: ScrcpyLogLevel;

    bitRate: number;

    maxFps?: number;

    orientation?: ScrcpyScreenOrientation;

    profile?: AndroidCodecProfile;

    level?: AndroidCodecLevel;

    encoder?: string;
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

    private readonly stoppedEvent = new EventEmitter<void>();
    public get onStopped() { return this.stoppedEvent.event; }

    private _running = true;
    public get running() { return this._running; }

    private _width: number;
    public get width() { return this._width; }

    private _height: number;
    public get height() { return this._height; }

    private readonly videoDataEvent = new EventEmitter<VideoPacket>();
    public get onVideoData() { return this.videoDataEvent.event; }

    private readonly videoStream: AdbBufferedStream;

    private readonly controlStream: AdbBufferedStream;

    private readonly clipboardChangeEvent = new EventEmitter<string>();
    public get onClipboardChange() { return this.clipboardChangeEvent.event; }

    public constructor(
        process: AdbStream,
        pendingMessages: string[],
        width: number,
        height: number,
        videoStream: AdbBufferedStream,
        controlStream: AdbBufferedStream
    ) {
        this.process = process;
        this.process.onData(this.handleProcessOutput, this);
        this.process.onClose(this.handleProcessStopped, this);

        for (const message of pendingMessages) {
            this.processLogMessage(message);
        }

        this._width = width;
        this._height = height;
        this.videoStream = videoStream;
        this.controlStream = controlStream;

        this.receiveVideo();
        this.receiveControl();
    }

    private handleProcessOutput(data: ArrayBuffer) {
        const message = this.process.backend.decodeUtf8(data);
        this.processLogMessage(message);
    }

    private handleProcessStopped() {
        this._running = false;
        this.stoppedEvent.fire();
    }

    private processLogMessage(message: string) {
        if (message.startsWith('[server] ')) {
            message = message.substring('[server] '.length + 1);

            if (message.startsWith('ERROR:')) {
                this.errorEvent.fire(message.substring('ERROR: '.length + 1));
            } else if (message.startsWith('INFO:')) {
                this.infoEvent.fire(message.substring('INFO: '.length + 1));
            }
        }
    }

    private async receiveVideo() {
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

            this.videoDataEvent.fire({ pts, size: array.byteLength, data: array });
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
            return;
        }
    }

    public async injectTouch(message: ScrcpyInjectTouchControlMessage) {
        const buffer = ScrcpyInjectTouchControlMessage.serialize(message, this.process.backend);
        await this.controlStream.write(buffer);
    }

    public async stop() {
        if (!this._running) {
            return;
        }

        await this.process.close();
        this._running = false;
    }
}

export async function createScrcpyConnection(options: ScrcpyOptions) {
    const {
        device,
        path,
        version,
        logLevel = ScrcpyLogLevel.Error,
        bitRate,
        maxFps = 0,
        orientation = ScrcpyScreenOrientation.Unlocked,
        profile = AndroidCodecProfile.Baseline,
        level = AndroidCodecLevel.Level4,
        encoder = '-',
    } = options;

    const queue = new EventQueue<AdbStream>();
    const reverseRegistry = await device.reverse.add('localabstract:scrcpy', 27183, {
        onStream(packet, stream) {
            queue.push(stream);
        },
    });

    const process = await device.spawn(
        `CLASSPATH=${path}`,
        'app_process',
        /*          unused */ '/',
        'com.genymobile.scrcpy.Server',
        version,
        logLevel,
        /*        max_size */ '0', // (0: unlimited)
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

    const pendingMessages: string[] = [];
    const dispose = process.onData(data => {
        const message = device.backend.decodeUtf8(data);
        pendingMessages.push(message);
    });

    const videoStream = new AdbBufferedStream(await queue.next());
    const controlStream = new AdbBufferedStream(await queue.next());

    // Don't await this!
    // `reverse.remove`'s response will never arrive
    // before we read all pending data from `videoStream`
    device.reverse.remove(reverseRegistry);

    // Device name, we don't need it
    await videoStream.read(64);
    // Initial video size
    const { width, height } = await Size.deserialize(videoStream);

    dispose();

    return new ScrcpyConnection(
        process,
        pendingMessages,
        width,
        height,
        videoStream,
        controlStream
    );
}
