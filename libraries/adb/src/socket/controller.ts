import { PromiseResolver } from "@yume-chan/async";
import { AdbCommand } from '../packet';
import { ChunkStream, TransformStream, WritableStream, WritableStreamDefaultWriter } from '../stream';
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

export class AdbSocketController implements AdbSocketInfo {
    private readonly dispatcher!: AdbPacketDispatcher;

    public readonly localId!: number;
    public readonly remoteId!: number;
    public readonly localCreated!: boolean;
    public readonly serviceString!: string;

    private readonly _readablePassthrough: TransformStream<Uint8Array, Uint8Array>;
    private readonly _readablePassthroughWriter: WritableStreamDefaultWriter<Uint8Array>;
    public get readable() { return this._readablePassthrough.readable; }

    private _writePromise: PromiseResolver<void> | undefined;
    public readonly writable: WritableStream<Uint8Array>;

    private _writableClosed = false;

    private _closed = false;
    public get closed() { return this._closed; }

    public constructor(options: AdbSocketConstructionOptions) {
        Object.assign(this, options);

        // Check this image to help you understand the stream graph
        // cspell: disable-next-line
        // https://www.plantuml.com/plantuml/png/TL0zoeGm4ErpYc3l5JxyS0yWM6mX5j4C6p4cxcJ25ejttuGX88ZftizxUKmJI275pGhXl0PP_UkfK_CAz5Z2hcWsW9Ny2fdU4C1f5aSchFVxA8vJjlTPRhqZzDQMRB7AklwJ0xXtX0ZSKH1h24ghoKAdGY23FhxC4nS2pDvxzIvxb-8THU0XlEQJ-ZB7SnXTAvc_LhOckhMdLBnbtndpb-SB7a8q2SRD_W00

        this._readablePassthrough = new TransformStream({}, {
            highWaterMark: options.highWaterMark ?? 16 * 1024,
            size(chunk) { return chunk.byteLength; }
        });
        this._readablePassthroughWriter = this._readablePassthrough.writable.getWriter();

        const { readable, writable } = new ChunkStream(this.dispatcher.maxPayloadSize);
        this.writable = writable;
        readable.pipeTo(new WritableStream<Uint8Array>({
            write: async (chunk) => {
                if (this._writableClosed) {
                    throw new Error('Socket closed');
                }

                // Wait for an ack packet
                this._writePromise = new PromiseResolver();
                await this.dispatcher.sendPacket(
                    AdbCommand.Write,
                    this.localId,
                    this.remoteId,
                    chunk
                );
                await this._writePromise.promise;
            },
            close: async () => {
                await this.close();
            },
            abort: async () => {
                // Abort a socket is equivalent to close it
                await this.close();
            }
        }));
    }

    public enqueue(packet: Uint8Array) {
        return this._readablePassthroughWriter.write(packet);
    }

    public ack() {
        this._writePromise?.resolve();
    }

    public async close(): Promise<void> {
        if (!this._writableClosed) {
            this._writableClosed = true;

            // Error out the pending writes
            this._writePromise?.reject(new Error('Socket closed'));

            // Only send close packet when `close` is called before `dispose`
            // (the client initiated the close)
            await this.dispatcher.sendPacket(
                AdbCommand.Close,
                this.localId,
                this.remoteId
            );
        }
    }

    public dispose() {
        if (this._closed) {
            // @ts-ignore
            console.log('double close', new Error('').stack);
            throw new Error('double close');
        }

        this._closed = true;

        // Close `writable` side
        this.close();

        // Close `readable` side
        this._readablePassthroughWriter.close().catch(() => { });
    }
}
