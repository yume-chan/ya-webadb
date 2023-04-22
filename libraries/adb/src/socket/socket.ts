import { PromiseResolver } from "@yume-chan/async";
import type { Disposable } from "@yume-chan/event";
import type {
    Consumable,
    PushReadableStreamController,
    ReadableStream,
    ReadableWritablePair,
    WritableStream,
} from "@yume-chan/stream-extra";
import {
    ConsumableWritableStream,
    DistributionStream,
    DuplexStreamFactory,
    PushReadableStream,
    pipeFrom,
} from "@yume-chan/stream-extra";

import { AdbCommand } from "../packet.js";

import type { AdbPacketDispatcher, Closeable } from "./dispatcher.js";

export interface AdbSocketInfo {
    localId: number;
    remoteId: number;

    localCreated: boolean;
    serviceString: string;
}

export interface AdbSocketConstructionOptions extends AdbSocketInfo {
    dispatcher: AdbPacketDispatcher;
}

export class AdbSocketController
    implements
        AdbSocketInfo,
        ReadableWritablePair<Uint8Array, Consumable<Uint8Array>>,
        Closeable,
        Disposable
{
    private readonly dispatcher!: AdbPacketDispatcher;

    public readonly localId!: number;
    public readonly remoteId!: number;
    public readonly localCreated!: boolean;
    public readonly serviceString!: string;

    private _duplex: DuplexStreamFactory<Uint8Array, Consumable<Uint8Array>>;

    private _readable: ReadableStream<Uint8Array>;
    private _readableController!: PushReadableStreamController<Uint8Array>;
    public get readable() {
        return this._readable;
    }

    private _availableWriteBytesChanged: PromiseResolver<void> | undefined;
    /**
     * When delayed ack is disabled, can be `Infinity` if the socket is ready to write.
     * Exactly one packet can be written no matter how large it is. Or `-1` if the socket
     * is waiting for ack.
     *
     * When delayed ack is enabled, a non-negative finite number indicates the number of
     * bytes that can be written to the socket without receiving an ack.
     */
    private _availableWriteBytes = 0;
    /**
     * Gets the number of bytes that can be written to the socket without blocking.
     */
    public get availableWriteBytes() {
        return this._availableWriteBytes;
    }
    public readonly writable: WritableStream<Consumable<Uint8Array>>;

    private _closed = false;
    /**
     * Whether the socket is half-closed (i.e. the local side initiated the close).
     *
     * It's only used by dispatcher to avoid sending another `CLSE` packet to remote.
     */
    public get closed() {
        return this._closed;
    }

    private _endPromiseResolver = new PromiseResolver<void>();
    public get end() {
        return this._endPromiseResolver.promise;
    }

    private _socket: AdbSocket;
    public get socket() {
        return this._socket;
    }

    public constructor(options: AdbSocketConstructionOptions) {
        Object.assign(this, options);

        // Check this image to help you understand the stream graph
        // cspell: disable-next-line
        // https://www.plantuml.com/plantuml/png/TL0zoeGm4ErpYc3l5JxyS0yWM6mX5j4C6p4cxcJ25ejttuGX88ZftizxUKmJI275pGhXl0PP_UkfK_CAz5Z2hcWsW9Ny2fdU4C1f5aSchFVxA8vJjlTPRhqZzDQMRB7AklwJ0xXtX0ZSKH1h24ghoKAdGY23FhxC4nS2pDvxzIvxb-8THU0XlEQJ-ZB7SnXTAvc_LhOckhMdLBnbtndpb-SB7a8q2SRD_W00

        this._duplex = new DuplexStreamFactory<
            Uint8Array,
            Consumable<Uint8Array>
        >({
            close: async () => {
                this._closed = true;

                await this.dispatcher.sendPacket(
                    AdbCommand.Close,
                    this.localId,
                    this.remoteId
                );

                // Don't `dispose` here, we need to wait for `CLSE` response packet.
                return false;
            },
            dispose: () => {
                // Error out the pending writes
                this._availableWriteBytesChanged?.reject(
                    new Error("Can not write to closed socket")
                );
                this._endPromiseResolver.resolve();
            },
        });

        this._readable = this._duplex.wrapReadable(
            new PushReadableStream((controller) => {
                this._readableController = controller;
            })
        );

        this.writable = pipeFrom(
            this._duplex.createWritable(
                new ConsumableWritableStream<Uint8Array>({
                    write: async (chunk) => {
                        const length = chunk.byteLength;
                        while (this._availableWriteBytes < length) {
                            // Only one lock is required because Web Streams API guarantees
                            // that `write` is not reentrant.
                            this._availableWriteBytesChanged =
                                new PromiseResolver();
                            await this._availableWriteBytesChanged.promise;
                        }

                        if (this._availableWriteBytes === Infinity) {
                            this._availableWriteBytes = -1;
                        } else {
                            this._availableWriteBytes -= length;
                        }

                        await this.dispatcher.sendPacket(
                            AdbCommand.Write,
                            this.localId,
                            this.remoteId,
                            chunk
                        );
                    },
                })
            ),
            new DistributionStream(this.dispatcher.options.maxPayloadSize)
        );

        this._socket = new AdbSocket(this);
    }

    public async enqueue(data: Uint8Array) {
        // Consumer may abort the `ReadableStream` to close the socket,
        // it's OK to throw away further packets in this case.
        if (this._readableController.abortSignal.aborted) {
            return;
        }

        await this._readableController.enqueue(data);
    }

    public ack(bytes: number) {
        this._availableWriteBytes += bytes;
        this._availableWriteBytesChanged?.resolve();
    }

    public async close(): Promise<void> {
        await this._duplex.close();
    }

    public dispose() {
        return this._duplex.dispose();
    }
}

/**
 * A duplex stream representing a socket to ADB daemon.
 *
 * To close it, call either `socket.close()`,
 * `socket.readable.cancel()`, `socket.readable.getReader().cancel()`,
 * `socket.writable.abort()`, `socket.writable.getWriter().abort()`,
 * `socket.writable.close()` or `socket.writable.getWriter().close()`.
 */
export class AdbSocket
    implements
        AdbSocketInfo,
        ReadableWritablePair<Uint8Array, Consumable<Uint8Array>>
{
    private _controller: AdbSocketController;

    public get localId(): number {
        return this._controller.localId;
    }
    public get remoteId(): number {
        return this._controller.remoteId;
    }
    public get localCreated(): boolean {
        return this._controller.localCreated;
    }
    public get serviceString(): string {
        return this._controller.serviceString;
    }

    public get readable(): ReadableStream<Uint8Array> {
        return this._controller.readable;
    }
    public get writable(): WritableStream<Consumable<Uint8Array>> {
        return this._controller.writable;
    }

    public get closed(): boolean {
        return this._controller.closed;
    }

    public get end(): Promise<void> {
        return this._controller.end;
    }

    public constructor(controller: AdbSocketController) {
        this._controller = controller;
    }

    public close() {
        return this._controller.close();
    }
}
