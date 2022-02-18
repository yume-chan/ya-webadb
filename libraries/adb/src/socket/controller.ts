import { AutoDisposable } from '@yume-chan/event';
import { AdbCommand } from '../packet';
import { AutoResetEvent, chunkArrayLike, TransformStream, WritableStream, WritableStreamDefaultWriter } from '../utils';
import { AdbPacketDispatcher } from './dispatcher';

export interface AdbSocketInfo {
    localId: number;
    remoteId: number;

    localCreated: boolean;

    serviceString: string;
}

export interface AdbSocketConstructionOptions {
    dispatcher: AdbPacketDispatcher;

    localId: number;

    remoteId: number;

    localCreated: boolean;

    serviceString: string;

    highWaterMark?: number | undefined;
}

export class AdbSocketController extends AutoDisposable implements AdbSocketInfo {
    private readonly writeChunkLock = this.addDisposable(new AutoResetEvent());
    private readonly writeLock = this.addDisposable(new AutoResetEvent());

    private readonly dispatcher!: AdbPacketDispatcher;

    public readonly localId!: number;
    public readonly remoteId!: number;
    public readonly localCreated!: boolean;
    public readonly serviceString!: string;

    private readonly _passthrough: TransformStream<ArrayBuffer, ArrayBuffer>;
    private readonly _passthroughWriter: WritableStreamDefaultWriter<ArrayBuffer>;
    public get readable() { return this._passthrough.readable; }

    public readonly writable: WritableStream<ArrayBuffer>;

    private _closed = false;
    public get closed() { return this._closed; }

    public constructor(options: AdbSocketConstructionOptions) {
        super();
        Object.assign(this, options);

        this._passthrough = new TransformStream({}, {
            highWaterMark: options.highWaterMark ?? 16 * 1024,
            size(chunk) { return chunk.byteLength; }
        });
        this._passthroughWriter = this._passthrough.writable.getWriter();

        this.writable = new WritableStream({
            write: async (chunk) => {
                await this.write(chunk);
            },
            close: () => {
                this.close();
            },
        }, {
            highWaterMark: options.highWaterMark ?? 16 * 1024,
            size(chunk) { return chunk.byteLength; }
        });
    }

    public enqueue(packet: ArrayBuffer) {
        return this._passthroughWriter.write(packet);
    }

    private async writeChunk(data: ArrayBuffer): Promise<void> {
        try {
            // Wait for an ack packet
            await this.writeChunkLock.wait();
        } catch {
            // Lock has been disposed, which means the socket has been closed
            throw new Error('Can not write after closed');
        }

        await this.dispatcher.sendPacket(
            AdbCommand.Write,
            this.localId,
            this.remoteId,
            data
        );
    }

    public async write(data: ArrayBuffer): Promise<void> {
        try {
            // Keep write operations in order
            await this.writeLock.wait();
        } catch {
            // Lock has been disposed, which means the socket has been closed
            throw new Error('Can not write after closed');
        }

        for await (const chunk of chunkArrayLike(data, this.dispatcher.maxPayloadSize)) {
            await this.writeChunk(chunk);
        }
        this.writeLock.notify();
    }

    public ack() {
        this.writeChunkLock.notify();
    }

    public async close(): Promise<void> {
        if (!this._closed) {
            // prevent nested calls
            this._closed = true;

            // Immediately cancel all pending writes
            this.writeLock.dispose();
            this.writeChunkLock.dispose();

            await this.dispatcher.sendPacket(AdbCommand.Close, this.localId, this.remoteId);
            this._passthroughWriter.close();
            this.writable.close();
        }
    }

    public override dispose() {
        this._closed = true;
        this.close();
        super.dispose();
    }
}
