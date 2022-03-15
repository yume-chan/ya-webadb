import { PromiseResolver } from "@yume-chan/async";
import { AdbCommand } from '../packet.js';
import { ChunkStream, DuplexStreamFactory, pipeFrom, ReadableStream, WritableStream, type PushReadableStreamController } from '../stream/index.js';
import type { AdbPacketDispatcher } from './dispatcher.js';

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

export class AdbSocket implements AdbSocketInfo {
    private readonly dispatcher!: AdbPacketDispatcher;

    public readonly localId!: number;
    public readonly remoteId!: number;
    public readonly localCreated!: boolean;
    public readonly serviceString!: string;

    private _factory: DuplexStreamFactory<Uint8Array, Uint8Array>;

    private _readable: ReadableStream<Uint8Array>;
    private _readableController!: PushReadableStreamController<Uint8Array>;
    public get readable() { return this._readable; }

    private _writePromise: PromiseResolver<void> | undefined;
    public readonly writable: WritableStream<Uint8Array>;

    private _closed = false;
    public get closed() { return this._closed; }

    public constructor(options: AdbSocketConstructionOptions) {
        Object.assign(this, options);

        // Check this image to help you understand the stream graph
        // cspell: disable-next-line
        // https://www.plantuml.com/plantuml/png/TL0zoeGm4ErpYc3l5JxyS0yWM6mX5j4C6p4cxcJ25ejttuGX88ZftizxUKmJI275pGhXl0PP_UkfK_CAz5Z2hcWsW9Ny2fdU4C1f5aSchFVxA8vJjlTPRhqZzDQMRB7AklwJ0xXtX0ZSKH1h24ghoKAdGY23FhxC4nS2pDvxzIvxb-8THU0XlEQJ-ZB7SnXTAvc_LhOckhMdLBnbtndpb-SB7a8q2SRD_W00

        this._factory = new DuplexStreamFactory<Uint8Array, Uint8Array>({
            close: async () => {
                await this.close();
            },
        });

        this._readable = this._factory.createPushReadable(controller => {
            this._readableController = controller;
        }, {
            highWaterMark: options.highWaterMark ?? 16 * 1024,
            size(chunk) { return chunk.byteLength; }
        });

        this.writable = pipeFrom(
            this._factory.createWritable({
                write: async (chunk) => {
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
            }),
            new ChunkStream(this.dispatcher.maxPayloadSize)
        );
    }

    /**
     * @internal
     */
    public async enqueue(packet: Uint8Array) {
        await this._readableController.enqueue(packet);
    }

    /**
     * @internal
     */
    public ack() {
        this._writePromise?.resolve();
    }

    public async close(): Promise<void> {
        // Error out the pending writes
        this._writePromise?.reject(new Error('Socket closed'));

        if (!this._closed) {
            this._closed = true;

            // Only send close packet when `close` is called before `dispose`
            // (the client initiated the close)
            await this.dispatcher.sendPacket(
                AdbCommand.Close,
                this.localId,
                this.remoteId
            );
        }
    }

    /**
     * @internal
     */
    public dispose() {
        this._closed = true;

        this._factory.close();

        // Close `writable` side
        this.close();
    }
}
