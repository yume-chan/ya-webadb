import { PromiseResolver } from "@yume-chan/async";
import type { Disposable } from "@yume-chan/event";
import type {
    PushReadableStreamController,
    ReadableStream,
    WritableStream,
    WritableStreamDefaultController,
} from "@yume-chan/stream-extra";
import { MaybeConsumable, PushReadableStream } from "@yume-chan/stream-extra";
import { EmptyUint8Array } from "@yume-chan/struct";

import type { AdbSocket } from "../adb.js";

import type { AdbPacketDispatcher } from "./dispatcher.js";
import { AdbCommand } from "./packet.js";

export interface AdbDaemonSocketInfo {
    localId: number;
    remoteId: number;

    localCreated: boolean;
    service: string;
}

export interface AdbDaemonSocketInit extends AdbDaemonSocketInfo {
    dispatcher: AdbPacketDispatcher;

    highWaterMark?: number | undefined;

    /**
     * The initial delayed ack byte count, or `Infinity` if delayed ack is disabled.
     */
    availableWriteBytes: number;
}

export class AdbDaemonSocketController
    implements AdbDaemonSocketInfo, AdbSocket, Disposable
{
    readonly #dispatcher!: AdbPacketDispatcher;

    readonly localId!: number;
    readonly remoteId!: number;
    readonly localCreated!: boolean;
    readonly service!: string;

    readonly #readable: ReadableStream<Uint8Array>;
    #readableController!: PushReadableStreamController<Uint8Array>;
    get readable() {
        return this.#readable;
    }

    #writableController!: WritableStreamDefaultController;
    readonly writable: WritableStream<MaybeConsumable<Uint8Array>>;

    #closed = false;

    readonly #closedPromise = new PromiseResolver<undefined>();
    get closed() {
        return this.#closedPromise.promise;
    }

    readonly #socket: AdbDaemonSocket;
    get socket() {
        return this.#socket;
    }

    #availableWriteBytesChanged: PromiseResolver<void> | undefined;
    /**
     * When delayed ack is disabled, returns `Infinity` if the socket is ready to write
     * (exactly one packet can be written no matter how large it is), or `-1` if the socket
     * is waiting for ack message.
     *
     * When delayed ack is enabled, returns a non-negative finite number indicates the number of
     * bytes that can be written to the socket before waiting for ack message.
     */
    #availableWriteBytes = 0;

    constructor(options: AdbDaemonSocketInit) {
        this.#dispatcher = options.dispatcher;
        this.localId = options.localId;
        this.remoteId = options.remoteId;
        this.localCreated = options.localCreated;
        this.service = options.service;

        this.#readable = new PushReadableStream((controller) => {
            this.#readableController = controller;
        });

        this.writable = new MaybeConsumable.WritableStream<Uint8Array>({
            start: (controller) => {
                this.#writableController = controller;
                controller.signal.addEventListener("abort", () => {
                    this.#availableWriteBytesChanged?.reject(
                        controller.signal.reason,
                    );
                });
            },
            write: async (data) => {
                const size = data.length;
                const chunkSize = this.#dispatcher.options.maxPayloadSize;
                for (
                    let start = 0, end = chunkSize;
                    start < size;
                    start = end, end += chunkSize
                ) {
                    const chunk = data.subarray(start, end);
                    await this.#writeChunk(chunk);
                }
            },
        });

        this.#socket = new AdbDaemonSocket(this);
        this.#availableWriteBytes = options.availableWriteBytes;
    }

    async #writeChunk(data: Uint8Array) {
        const length = data.length;
        while (this.#availableWriteBytes < length) {
            // Only one lock is required because Web Streams API guarantees
            // that `write` is not reentrant.
            const resolver = new PromiseResolver<void>();
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
        await this.#readableController.enqueue(data);
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
            EmptyUint8Array,
        );
    }

    dispose() {
        this.#readableController.close();
        this.#closedPromise.resolve(undefined);
    }
}

/**
 * A duplex stream representing a socket to ADB daemon.
 */
export class AdbDaemonSocket implements AdbDaemonSocketInfo, AdbSocket {
    readonly #controller: AdbDaemonSocketController;

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
    get writable(): WritableStream<MaybeConsumable<Uint8Array>> {
        return this.#controller.writable;
    }

    get closed(): Promise<undefined> {
        return this.#controller.closed;
    }

    constructor(controller: AdbDaemonSocketController) {
        this.#controller = controller;
    }

    close() {
        return this.#controller.close();
    }
}
