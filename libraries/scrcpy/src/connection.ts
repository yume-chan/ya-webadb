import type { Adb, AdbSocket } from "@yume-chan/adb";
import type { Disposable } from "@yume-chan/event";
import type { ValueOrPromise } from "@yume-chan/struct";
import { delay } from "./utils.js";

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

    public abstract getStreams(): ValueOrPromise<[videoSteam: AdbSocket, controlStream: AdbSocket | undefined]>;

    public dispose(): void { }
}

export class ScrcpyClientForwardConnection extends ScrcpyClientConnection {
    private async connect(): Promise<AdbSocket> {
        return await this.device.createSocket('localabstract:scrcpy');
    }

    private async connectAndRetry(): Promise<AdbSocket> {
        for (let i = 0; i < 100; i++) {
            try {
                return await this.connect();
            } catch (e) {
                await delay(100);
            }
        }
        throw new Error(`Can't connect to server after 100 retries`);
    }

    private async connectVideoStream(): Promise<AdbSocket> {
        const stream = await this.connectAndRetry();
        if (this.options.sendDummyByte) {
            const reader = stream.readable.getReader();
            const { done, value } = await reader.read();
            // server will write a `0` to signal connection success
            if (done || value.byteLength !== 1 || value[0] !== 0) {
                throw new Error('Unexpected response from server');
            }
            reader.releaseLock();
        }
        return stream;
    }

    public async getStreams(): Promise<[videoSteam: AdbSocket, controlStream: AdbSocket | undefined]> {
        const videoStream = await this.connectVideoStream();

        let controlStream: AdbSocket | undefined;
        if (this.options.control) {
            controlStream = await this.connectAndRetry();
        }

        // Server only writes device meta after control socket is connected (if enabled)
        if (this.options.sendDeviceMeta) {
            const reader = videoStream.readable.getReader();
            const { done, value } = await reader.read();
            // 64 bytes device name + 2 bytes video width + 2 bytes video height
            if (done || value.byteLength !== 64 + 2 + 2) {
                throw new Error('Unexpected response from server');
            }
            reader.releaseLock();
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
        this.address = await this.device.reverse.add(
            'localabstract:scrcpy',
            'tcp:27183',
            socket => {
                writer.write(socket);
                return true;
            },
        );
    }

    private async accept(): Promise<AdbSocket> {
        return (await this.streams.read()).value!;
    }

    public async getStreams(): Promise<[videoSteam: AdbSocket, controlStream: AdbSocket | undefined]> {
        const videoStream = await this.accept();

        let controlStream: AdbSocket | undefined;
        if (this.options.control) {
            controlStream = await this.accept();
        }

        // Server only writes device meta after control socket is connected (if enabled)
        if (this.options.sendDeviceMeta) {
            const reader = videoStream.readable.getReader();
            const { done, value } = await reader.read();
            // 64 bytes device name + 2 bytes video width + 2 bytes video height
            if (done || value.byteLength !== 64 + 2 + 2) {
                throw new Error('Unexpected response from server');
            }
            reader.releaseLock();
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
