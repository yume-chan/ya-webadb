import type { Adb } from '@yume-chan/adb';
import { delay } from '@yume-chan/async';
import type { Disposable } from '@yume-chan/event';
import type { ReadableStream, ReadableWritablePair } from '@yume-chan/stream-extra';
import type { ValueOrPromise } from '@yume-chan/struct';

export interface AdbScrcpyConnectionOptions {
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

export abstract class AdbScrcpyConnection implements Disposable {
    protected adb: Adb;

    protected options: AdbScrcpyConnectionOptions;

    public constructor(adb: Adb, options: AdbScrcpyConnectionOptions) {
        this.adb = adb;
        this.options = options;
    }

    public initialize(): ValueOrPromise<void> { }

    public abstract getStreams(): ValueOrPromise<[videoSteam: ReadableStream<Uint8Array>, controlStream: ReadableWritablePair<Uint8Array, Uint8Array> | undefined]>;

    public dispose(): void { }
}

export class AdbScrcpyForwardConnection extends AdbScrcpyConnection {
    private connect(): Promise<ReadableWritablePair<Uint8Array, Uint8Array>> {
        return this.adb.createSocket('localabstract:scrcpy');
    }

    private async connectAndRetry(): Promise<ReadableWritablePair<Uint8Array, Uint8Array>> {
        for (let i = 0; i < 100; i++) {
            try {
                return await this.connect();
            } catch (e) {
                await delay(100);
            }
        }
        throw new Error(`Can't connect to server after 100 retries`);
    }

    private async connectVideoStream(): Promise<ReadableStream<Uint8Array>> {
        const { readable: videoStream } = await this.connectAndRetry();
        if (this.options.sendDummyByte) {
            const reader = videoStream.getReader();
            const { done, value } = await reader.read();
            // server will write a `0` to signal connection success
            if (done || value.byteLength !== 1 || value[0] !== 0) {
                throw new Error('Unexpected response from server');
            }
            reader.releaseLock();
        }
        return videoStream;
    }

    public async getStreams(): Promise<[videoSteam: ReadableStream<Uint8Array>, controlStream: ReadableWritablePair<Uint8Array, Uint8Array> | undefined]> {
        const videoStream = await this.connectVideoStream();

        let controlStream: ReadableWritablePair<Uint8Array, Uint8Array> | undefined;
        if (this.options.control) {
            controlStream = await this.connectAndRetry();
        }

        // Server only writes device meta after control socket is connected (if enabled)
        if (this.options.sendDeviceMeta) {
            const reader = videoStream.getReader();
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

export class AdbScrcpyReverseConnection extends AdbScrcpyConnection {
    private streams!: ReadableStreamDefaultReader<ReadableWritablePair<Uint8Array, Uint8Array>>;

    private address!: string;

    public override async initialize(): Promise<void> {
        // try to unbind first, ignore errors
        await this.adb.reverse.remove('localabstract:scrcpy').catch(() => { });

        const queue = new TransformStream<ReadableWritablePair<Uint8Array, Uint8Array>>();
        this.streams = queue.readable.getReader();
        const writer = queue.writable.getWriter();
        this.address = await this.adb.reverse.add(
            'localabstract:scrcpy',
            'tcp:27183',
            socket => {
                writer.write(socket);
                return true;
            },
        );
    }

    private async accept(): Promise<ReadableWritablePair<Uint8Array, Uint8Array>> {
        return (await this.streams.read()).value!;
    }

    public async getStreams(): Promise<[videoSteam: ReadableStream<Uint8Array>, controlStream: ReadableWritablePair<Uint8Array, Uint8Array> | undefined]> {
        const { readable: videoStream } = await this.accept();

        let controlStream: ReadableWritablePair<Uint8Array, Uint8Array> | undefined;
        if (this.options.control) {
            controlStream = await this.accept();
        }

        // Server only writes device meta after control socket is connected (if enabled)
        if (this.options.sendDeviceMeta) {
            const reader = videoStream.getReader();
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
        this.adb.reverse.remove(this.address);
    }
}
