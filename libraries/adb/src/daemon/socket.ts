import { PromiseResolver } from "@yume-chan/async";
import type { Disposable } from "@yume-chan/event";
import type {
    AbortSignal,
    Consumable,
    PushReadableStreamController,
    ReadableStream,
    WritableStream,
    WritableStreamDefaultController,
} from "@yume-chan/stream-extra";
import {
    ConsumableWritableStream,
    PushReadableStream,
} from "@yume-chan/stream-extra";

import type { AdbSocket } from "../adb.js";

import type { AdbPacketDispatcher } from "./dispatcher.js";
import { AdbCommand } from "./packet.js";

export interface AdbDaemonSocketInfo {
    localId: number;
    remoteId: number;

    localCreated: boolean;
    service: string;
}

export interface AdbDaemonSocketConstructionOptions
    extends AdbDaemonSocketInfo {
    dispatcher: AdbPacketDispatcher;

    highWaterMark?: number | undefined;
}

export class AdbDaemonSocketController
    implements AdbDaemonSocketInfo, AdbSocket, Disposable
{
    readonly #dispatcher!: AdbPacketDispatcher;

    readonly localId!: number;
    readonly remoteId!: number;
    readonly localCreated!: boolean;
    readonly service!: string;

    #readable: ReadableStream<Uint8Array>;
    #readableController!: PushReadableStreamController<Uint8Array>;
    get readable() {
        return this.#readable;
    }

    #writableController!: WritableStreamDefaultController;
    readonly writable: WritableStream<Consumable<Uint8Array>>;

    #closed = false;

    #closedPromise = new PromiseResolver<void>();
    get closed() {
        return this.#closedPromise.promise;
    }

    #socket: AdbDaemonSocket;
    get socket() {
        return this.#socket;
    }

    #availableWriteBytesChanged: PromiseResolver<void> | undefined;
    /**
     * When delayed ack is disabled, can be `Infinity` if the socket is ready to write.
     * Exactly one packet can be written no matter how large it is. Or `-1` if the socket
     * is waiting for ack.
     *
     * When delayed ack is enabled, a non-negative finite number indicates the number of
     * bytes that can be written to the socket before receiving an ack.
     */
    #availableWriteBytes = 0;

    constructor(options: AdbDaemonSocketConstructionOptions) {
        this.#dispatcher = options.dispatcher;
        this.localId = options.localId;
        this.remoteId = options.remoteId;
        this.localCreated = options.localCreated;
        this.service = options.service;

        this.#readable = new PushReadableStream((controller) => {
            this.#readableController = controller;
        });

        this.writable = new ConsumableWritableStream<Uint8Array>({
            start: (controller) => {
                this.#writableController = controller;
            },
            write: async (data, controller) => {
                const size = data.length;
                const chunkSize = this.#dispatcher.options.maxPayloadSize;
                for (
                    let start = 0, end = chunkSize;
                    start < size;
                    start = end, end += chunkSize
                ) {
                    const chunk = data.subarray(start, end);
                    await this.#writeChunk(chunk, controller.signal);
                }
            },
        });

        this.#socket = new AdbDaemonSocket(this);
    }

    async #writeChunk(data: Uint8Array, signal: AbortSignal) {
        const length = data.byteLength;
        while (this.#availableWriteBytes < length) {
            // Only one lock is required because Web Streams API guarantees
            // that `write` is not reentrant.
            const resolver = new PromiseResolver<void>();
            signal.addEventListener("abort", () => {
                resolver.reject(signal.reason);
            });

            this.#availableWriteBytesChanged = resolver;
            await resolver.promise;
        }

        if (this.#availableWriteBytes === Infinity) {
            this.#availableWriteBytes = -1;
        } else {
            this.#availableWriteBytes -= length;
        }

        await this.#dispatcher.sendPacket(
            AdbCommand.Write,
            this.localId,
            this.remoteId,
            data,
        );
    }

    async enqueue(data: Uint8Array) {
        // Consumers can `cancel` the `readable` if they are not interested in future data.
        // Throw away the data if that happens.
        if (this.#readableController.abortSignal.aborted) {
            return;
        }

        try {
            await this.#readableController.enqueue(data);
        } catch (e) {
            if (this.#readableController.abortSignal.aborted) {
                return;
            }
            throw e;
        }
    }

    public ack(bytes: number) {
        this.#availableWriteBytes += bytes;
        this.#availableWriteBytesChanged?.resolve();
    }

    async close(): Promise<void> {
        if (this.#closed) {
            return;
        }
        this.#closed = true;

        this.#availableWriteBytesChanged?.reject(new Error("Socket closed"));

        try {
            this.#writableController.error(new Error("Socket closed"));
        } catch {
            // ignore
        }

        await this.#dispatcher.sendPacket(
            AdbCommand.Close,
            this.localId,
            this.remoteId,
        );
    }

    dispose() {
        try {
            this.#readableController.close();
        } catch {
            // ignore
        }

        this.#closedPromise.resolve();
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
export class AdbDaemonSocket implements AdbDaemonSocketInfo, AdbSocket {
    #controller: AdbDaemonSocketController;

    get localId(): number {
        return this.#controller.localId;
    }
    get remoteId(): number {
        return this.#controller.remoteId;
    }
    get localCreated(): boolean {
        return this.#controller.localCreated;
    }
    get service(): string {
        return this.#controller.service;
    }

    get readable(): ReadableStream<Uint8Array> {
        return this.#controller.readable;
    }
    get writable(): WritableStream<Consumable<Uint8Array>> {
        return this.#controller.writable;
    }

    get closed(): Promise<void> {
        return this.#controller.closed;
    }

    constructor(controller: AdbDaemonSocketController) {
        this.#controller = controller;
    }

    close() {
        return this.#controller.close();
    }
}
