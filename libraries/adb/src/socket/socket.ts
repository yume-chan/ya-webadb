import { PromiseResolver } from "@yume-chan/async";
import { AdbCommand } from '../packet.js';
import { ChunkStream, DuplexStreamFactory, pipeFrom, type PushReadableStreamController, type ReadableStream, type ReadableWritablePair, type WritableStream } from '../stream/index.js';
import type { AdbPacketDispatcher } from './dispatcher.js';

export interface AdbSocketInfo {
    localId: number;
    remoteId: number;

    localCreated: boolean;
    serviceString: string;
}

export interface AdbSocketConstructionOptions extends AdbSocketInfo {
    dispatcher: AdbPacketDispatcher;

    highWaterMark?: number | undefined;
}

export class AdbSocketController implements AdbSocketInfo, ReadableWritablePair<Uint8Array, Uint8Array> {
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

    private _socket: AdbSocket;
    public get socket() { return this._socket; }

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
            new ChunkStream(this.dispatcher.options.maxPayloadSize)
        );

        this._socket = new AdbSocket(this);
    }

    public async enqueue(packet: Uint8Array) {
        await this._readableController.enqueue(packet);
    }

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

    public dispose() {
        this._closed = true;

        this._factory.close();

        // Close `writable` side
        this.close();
    }
}

export class AdbSocket implements AdbSocketInfo, ReadableWritablePair<Uint8Array, Uint8Array>{
    private _controller: AdbSocketController;

    public get localId(): number { return this._controller.localId; }
    public get remoteId(): number { return this._controller.remoteId; }
    public get localCreated(): boolean { return this._controller.localCreated; }
    public get serviceString(): string { return this._controller.serviceString; }

    public get readable(): ReadableStream<Uint8Array> { return this._controller.readable; }
    public get writable(): WritableStream<Uint8Array> { return this._controller.writable; }

    public constructor(controller: AdbSocketController) {
        this._controller = controller;
    }

    public close() {
        return this._controller.close();
    }
}
