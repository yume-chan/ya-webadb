import { Adb, AdbBufferedStream, AdbSocket } from "@yume-chan/adb";
import { Disposable } from "@yume-chan/event";
import { ValueOrPromise } from "@yume-chan/struct";
import { delay } from "./utils";

export interface ScrcpyClientConnectionOptions {
    control: boolean;

    /**
     * Write a byte on start to detect connection issues
     */
    sendDummyByte: boolean;

    /**
     * Send device name and size
     */
    sendDeviceMeta: boolean;
}

export abstract class ScrcpyClientConnection implements Disposable {
    protected device: Adb;

    protected options: ScrcpyClientConnectionOptions;

    public constructor(device: Adb, options: ScrcpyClientConnectionOptions) {
        this.device = device;
        this.options = options;
    }

    public initialize(): ValueOrPromise<void> { }

    public abstract getStreams(): ValueOrPromise<[videoSteam: AdbBufferedStream, controlStream: AdbBufferedStream | undefined]>;

    public dispose(): void { }
}

export class ScrcpyClientForwardConnection extends ScrcpyClientConnection {
    private async connect(): Promise<AdbBufferedStream> {
        return new AdbBufferedStream(await this.device.createSocket('localabstract:scrcpy'));
    }

    private async connectAndRetry(): Promise<AdbBufferedStream> {
        for (let i = 0; i < 100; i++) {
            try {
                return await this.connect();
            } catch (e) {
                await delay(100);
            }
        }
        throw new Error(`Can't connect to server after 100 retries`);
    }

    private async connectVideoStream(): Promise<AdbBufferedStream> {
        const stream = await this.connectAndRetry();
        if (this.options.sendDummyByte) {
            // server will write a `0` to signal connection success
            await stream.read(1);
        }
        return stream;
    }

    public async getStreams(): Promise<[videoSteam: AdbBufferedStream, controlStream: AdbBufferedStream | undefined]> {
        const videoStream = await this.connectVideoStream();
        let controlStream: AdbBufferedStream | undefined;
        if (this.options.control) {
            controlStream = await this.connectAndRetry();
        }
        if (this.options.sendDeviceMeta) {
            // 64 bytes device name + 2 bytes video width + 2 bytes video height
            await videoStream.read(64 + 2 + 2);
        }
        return [videoStream, controlStream];
    }
}

export class ScrcpyClientReverseConnection extends ScrcpyClientConnection {
    private streams!: ReadableStreamDefaultReader<AdbSocket>;

    private address!: string;

    public override async initialize(): Promise<void> {
        try {
            // try to unbind first
            await this.device.reverse.remove('localabstract:scrcpy');
        } catch {
            // ignore error
        }

        const queue = new TransformStream<AdbSocket>();
        this.streams = queue.readable.getReader();
        const writer = queue.writable.getWriter();
        this.address = await this.device.reverse.add('localabstract:scrcpy', 27183, {
            onSocket: (packet, stream) => {
                writer.write(stream);
            },
        });
    }

    private async accept(): Promise<AdbBufferedStream> {
        return new AdbBufferedStream((await this.streams.read()).value!);
    }

    public async getStreams(): Promise<[videoSteam: AdbBufferedStream, controlStream: AdbBufferedStream | undefined]> {
        const videoStream = await this.accept();
        let controlStream: AdbBufferedStream | undefined;
        if (this.options.control) {
            controlStream = await this.accept();
        }
        if (this.options.sendDeviceMeta) {
            // 64 bytes device name + 2 bytes video width + 2 bytes video height
            await videoStream.read(64 + 2 + 2);
        }
        return [videoStream, controlStream];
    }

    public override dispose() {
        // Don't await this!
        // `reverse.remove`'s response will never arrive
        // before we read all pending data from `videoStream`
        this.device.reverse.remove(this.address);
    }
}
