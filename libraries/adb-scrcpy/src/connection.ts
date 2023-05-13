import type { Adb } from "@yume-chan/adb";
import { AdbReverseNotSupportedError, NOOP } from "@yume-chan/adb";
import { delay } from "@yume-chan/async";
import type { Disposable } from "@yume-chan/event";
import type {
    Consumable,
    ReadableStream,
    ReadableStreamDefaultReader,
    ReadableWritablePair,
} from "@yume-chan/stream-extra";
import {
    BufferedReadableStream,
    TransformStream,
} from "@yume-chan/stream-extra";
import type { ValueOrPromise } from "@yume-chan/struct";

export interface AdbScrcpyConnectionOptions {
    scid: number;

    /**
     * Whether to create a control stream
     */
    control: boolean;

    /**
     * In forward tunnel mode, read a byte from video socket on start to detect connection issues
     */
    sendDummyByte: boolean;

    audio: boolean;
}

export const SCRCPY_SOCKET_NAME_PREFIX = "scrcpy";

export interface AdbScrcpyConnectionStreams {
    video: ReadableStream<Uint8Array>;
    audio: ReadableStream<Uint8Array> | undefined;
    control:
        | ReadableWritablePair<Uint8Array, Consumable<Uint8Array>>
        | undefined;
}

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
        // pure virtual method
    }

    protected getSocketName(): string {
        let socketName = "localabstract:" + SCRCPY_SOCKET_NAME_PREFIX;
        if (this.options.scid !== undefined && this.options.scid >= 0) {
            socketName += "_" + this.options.scid.toString(16).padStart(8, "0");
        }
        return socketName;
    }

    public abstract getStreams(): ValueOrPromise<AdbScrcpyConnectionStreams>;

    public dispose(): void {
        // pure virtual method
    }
}

export class AdbScrcpyForwardConnection extends AdbScrcpyConnection {
    private _disposed = false;

    private connect(): Promise<
        ReadableWritablePair<Uint8Array, Consumable<Uint8Array>>
    > {
        return this.adb.createSocket(this.socketName);
    }

    private async connectAndRetry(): Promise<
        ReadableWritablePair<Uint8Array, Consumable<Uint8Array>>
    > {
        for (let i = 0; !this._disposed && i < 100; i += 1) {
            try {
                return await this.connect();
            } catch (e) {
                // Maybe the server is still starting
                await delay(100);
            }
        }
        throw new Error(`Can't connect to server after 100 retries`);
    }

    private async connectVideoStream(): Promise<ReadableStream<Uint8Array>> {
        const { readable: stream } = await this.connectAndRetry();
        if (this.options.sendDummyByte) {
            // Can't guarantee the stream will preserve message boundaries,
            // so buffer the stream
            const buffered = new BufferedReadableStream(stream);
            await buffered.readExactly(1);
            return buffered.release();
        }
        return stream;
    }

    public override async getStreams(): Promise<AdbScrcpyConnectionStreams> {
        const video = await this.connectVideoStream();

        const audio = this.options.audio
            ? (await this.connectAndRetry()).readable
            : undefined;

        const control = this.options.control
            ? await this.connectAndRetry()
            : undefined;

        return { video, audio, control };
    }

    public override dispose(): void {
        this._disposed = true;
    }
}

export class AdbScrcpyReverseConnection extends AdbScrcpyConnection {
    private streams!: ReadableStreamDefaultReader<
        ReadableWritablePair<Uint8Array, Consumable<Uint8Array>>
    >;

    private address!: string;

    public override async initialize(): Promise<void> {
        // try to unbind first
        await this.adb.reverse.remove(this.socketName).catch((e) => {
            if (e instanceof AdbReverseNotSupportedError) {
                throw e;
            }

            // Ignore other errors when unbinding
        });

        const queue = new TransformStream<
            ReadableWritablePair<Uint8Array, Consumable<Uint8Array>>,
            ReadableWritablePair<Uint8Array, Consumable<Uint8Array>>
        >();
        this.streams = queue.readable.getReader();
        const writer = queue.writable.getWriter();
        this.address = await this.adb.reverse.add(this.socketName, (socket) => {
            void writer.write(socket);
        });
    }

    private async accept(): Promise<
        ReadableWritablePair<Uint8Array, Consumable<Uint8Array>>
    > {
        return (await this.streams.read()).value!;
    }

    public async getStreams(): Promise<AdbScrcpyConnectionStreams> {
        const { readable: video } = await this.accept();

        const audio = this.options.audio
            ? (await this.accept()).readable
            : undefined;

        const control = this.options.control ? await this.accept() : undefined;

        return { video, audio, control };
    }

    public override dispose() {
        // Don't await this!
        // `reverse.remove`'s response will never arrive
        // before we read all pending data from Scrcpy streams
        // NOOP: failed to remove reverse tunnel is not a big deal
        this.adb.reverse.remove(this.address).catch(NOOP);
    }
}
