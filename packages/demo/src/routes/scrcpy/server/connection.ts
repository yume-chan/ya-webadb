import { Adb, AdbBufferedStream, AdbSocket, EventQueue } from "@yume-chan/adb";
import { Disposable } from "@yume-chan/event";
import { ValueOrPromise } from "@yume-chan/struct";
import { delay } from "../../../utils";

export abstract class ScrcpyClientConnection implements Disposable {
    protected device: Adb;

    public constructor(device: Adb) {
        this.device = device;
    }

    public initialize(): ValueOrPromise<void> { }

    public abstract getStreams(): ValueOrPromise<[videoSteam: AdbBufferedStream, controlStream: AdbBufferedStream]>;

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

    private async connectAndReadByte(): Promise<AdbBufferedStream> {
        const stream = await this.connectAndRetry();
        // server will write a `0` to signal connection success
        await stream.read(1);
        return stream;
    }

    public async getStreams(): Promise<[videoSteam: AdbBufferedStream, controlStream: AdbBufferedStream]> {
        return [
            await this.connectAndReadByte(),
            await this.connectAndRetry()
        ];
    }
}

export class ScrcpyClientReverseConnection extends ScrcpyClientConnection {
    private streams!: EventQueue<AdbSocket>;

    private address!: string;

    public async initialize(): Promise<void> {
        // try to unbind first
        try {
            await this.device.reverse.remove('localabstract:scrcpy');
        } catch {
            // ignore error
        }

        this.streams = new EventQueue<AdbSocket>();
        this.address = await this.device.reverse.add('localabstract:scrcpy', 27183, {
            onSocket: (packet, stream) => {
                this.streams.enqueue(stream);
            },
        });
    }

    private async accept(): Promise<AdbBufferedStream> {
        return new AdbBufferedStream(await this.streams.dequeue());
    }

    public async getStreams(): Promise<[videoSteam: AdbBufferedStream, controlStream: AdbBufferedStream]> {
        return [
            await this.accept(),
            await this.accept(),
        ];
    }

    public dispose() {
        // Don't await this!
        // `reverse.remove`'s response will never arrive
        // before we read all pending data from `videoStream`
        this.device.reverse.remove(this.address);
    }
}
