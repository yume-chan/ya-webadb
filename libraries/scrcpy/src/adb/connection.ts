import { AdbReverseNotSupportedError, type Adb } from "@yume-chan/adb";
import { delay } from "@yume-chan/async";
import { type Disposable } from "@yume-chan/event";
import {
    TransformStream,
    type ReadableStream,
    type ReadableStreamDefaultReader,
    type ReadableWritablePair,
} from "@yume-chan/stream-extra";
import { type ValueOrPromise } from "@yume-chan/struct";

export interface AdbScrcpyConnectionOptions {
    uid: number;

    /**
     * Whether to create a control stream
     */
    control: boolean;

    /**
     * In forward tunnel mode, read a byte from video socket on start to detect connection issues
     */
    sendDummyByte: boolean;

    /**
     * Read device name and size from video socket on start
     */
    sendDeviceMeta: boolean;
}

export const SCRCPY_SOCKET_NAME_PREFIX = "scrcpy";

export abstract class AdbScrcpyConnection implements Disposable {
    protected adb: Adb;

    protected options: AdbScrcpyConnectionOptions;

    protected socketName: string;

    public constructor(adb: Adb, options: AdbScrcpyConnectionOptions) {
        this.adb = adb;
        this.options = options;
        this.socketName = this.getSocketName();
    }

    public initialize(): ValueOrPromise<void> {
        // do nothing
    }

    protected getSocketName(): string {
        let socketName = "localabstract:" + SCRCPY_SOCKET_NAME_PREFIX;
        if (this.options.uid !== undefined && this.options.uid >= 0) {
            socketName += "_" + this.options.uid.toString(16).padStart(8, "0");
        }
        return socketName;
    }

    public abstract getStreams(): ValueOrPromise<
        [
            videoSteam: ReadableStream<Uint8Array>,
            controlStream:
                | ReadableWritablePair<Uint8Array, Uint8Array>
                | undefined
        ]
    >;

    protected async skipDeviceMeta(videoStream: ReadableStream<Uint8Array>) {
        // Server only writes device meta after control socket is connected (if enabled)
        if (this.options.sendDeviceMeta) {
            const reader = videoStream.getReader();
            const { done, value } = await reader.read();
            // 64 bytes device name + 2 bytes video width + 2 bytes video height
            if (done || value.byteLength !== 64 + 2 + 2) {
                throw new Error("Unexpected response from server");
            }
            reader.releaseLock();
        }
    }

    public dispose(): void {
        // do nothing
    }
}

export class AdbScrcpyForwardConnection extends AdbScrcpyConnection {
    private _disposed = false;

    private connect(): Promise<ReadableWritablePair<Uint8Array, Uint8Array>> {
        return this.adb.createSocket(this.socketName);
    }

    private async connectAndRetry(): Promise<
        ReadableWritablePair<Uint8Array, Uint8Array>
    > {
        for (let i = 0; !this._disposed && i < 100; i += 1) {
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
                throw new Error("Unexpected response from server");
            }
            reader.releaseLock();
        }
        return videoStream;
    }

    public override async getStreams(): Promise<
        [
            videoSteam: ReadableStream<Uint8Array>,
            controlStream:
                | ReadableWritablePair<Uint8Array, Uint8Array>
                | undefined
        ]
    > {
        const videoStream = await this.connectVideoStream();

        let controlStream:
            | ReadableWritablePair<Uint8Array, Uint8Array>
            | undefined;
        if (this.options.control) {
            controlStream = await this.connectAndRetry();
        }

        await this.skipDeviceMeta(videoStream);

        return [videoStream, controlStream];
    }

    public override dispose(): void {
        super.dispose();
        this._disposed = true;
    }
}

export class AdbScrcpyReverseConnection extends AdbScrcpyConnection {
    private streams!: ReadableStreamDefaultReader<
        ReadableWritablePair<Uint8Array, Uint8Array>
    >;

    private address!: string;

    public override async initialize(): Promise<void> {
        try {
            // try to unbind first
            await this.adb.reverse.remove(this.socketName);
        } catch (e) {
            if (e instanceof AdbReverseNotSupportedError) {
                throw e;
            }

            // Ignore other errors when unbinding
        }

        const queue = new TransformStream<
            ReadableWritablePair<Uint8Array, Uint8Array>,
            ReadableWritablePair<Uint8Array, Uint8Array>
        >();
        this.streams = queue.readable.getReader();
        const writer = queue.writable.getWriter();
        this.address = await this.adb.reverse.add(
            this.socketName,
            "tcp:27183",
            (socket) => {
                void writer.write(socket);
                return true;
            }
        );
    }

    private async accept(): Promise<
        ReadableWritablePair<Uint8Array, Uint8Array>
    > {
        return (await this.streams.read()).value!;
    }

    public async getStreams(): Promise<
        [
            videoSteam: ReadableStream<Uint8Array>,
            controlStream:
                | ReadableWritablePair<Uint8Array, Uint8Array>
                | undefined
        ]
    > {
        const { readable: videoStream } = await this.accept();

        let controlStream:
            | ReadableWritablePair<Uint8Array, Uint8Array>
            | undefined;
        if (this.options.control) {
            controlStream = await this.accept();
        }

        await this.skipDeviceMeta(videoStream);

        return [videoStream, controlStream];
    }

    public override dispose() {
        // Don't await this!
        // `reverse.remove`'s response will never arrive
        // before we read all pending data from `videoStream`
        this.adb.reverse.remove(this.address).catch((e) => {
            void e;
        });
    }
}
