import { clearTimeout, setTimeout } from "@yume-chan/stream-extra";
import { getUint32LittleEndian } from "@yume-chan/no-data-view";
import type {
    MaybeConsumable,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import {
    BufferCombiner,
    BufferedReadableStream,
    Consumable,
} from "@yume-chan/stream-extra";
import type { AsyncExactReadable, StructDeserializer } from "@yume-chan/struct";
import { decodeUtf8, string, struct, u32 } from "@yume-chan/struct";

import type { Adb } from "../../adb.js";
import { AutoResetEvent, encodeUtf8, unreachable } from "../../utils/index.js";

import { ResponseId } from "./id/index.js";

const NumberRequest = struct({ id: u32, arg: u32 }, { littleEndian: true });

class AdbSyncError extends Error {}
export { AdbSyncError as Error };

const FailResponse = struct(
    { message: string(u32) },
    {
        littleEndian: true,
        postDeserialize(value) {
            throw new AdbSyncError(value.message);
        },
    },
);

export class Socket implements AsyncExactReadable {
    static readonly NumberRequest = NumberRequest;
    static readonly FailResponse = FailResponse;

    readonly #socket: Adb.Socket;
    readonly #writer: WritableStreamDefaultWriter<MaybeConsumable<Uint8Array>>;
    readonly #readable: BufferedReadableStream;
    readonly #writeLock = new AutoResetEvent();
    readonly #combiner: BufferCombiner;
    #idleTimeoutId: ReturnType<typeof setTimeout> | null = null;

    get position() {
        return this.#readable.position;
    }

    get closed(): Promise<undefined> {
        return this.#socket.closed;
    }

    constructor(socket: Adb.Socket, bufferSize: number) {
        this.#socket = socket;
        this.#writer = socket.writable.getWriter();
        this.#readable = new BufferedReadableStream(socket.readable);
        this.#combiner = new BufferCombiner(bufferSize);
    }

    /**
     * Start an idle timer that will close the socket after the specified duration.
     * The timer is automatically cancelled when the socket is used.
     * @param timeout The timeout in milliseconds
     * @param callback The callback to invoke when the timeout expires
     */
    startIdleTimer(timeout: number, callback: () => void) {
        this.clearIdleTimer();
        this.#idleTimeoutId = setTimeout(callback, timeout);
    }

    /**
     * Clear the idle timer.
     */
    clearIdleTimer() {
        if (this.#idleTimeoutId !== null) {
            clearTimeout(this.#idleTimeoutId);
            this.#idleTimeoutId = null;
        }
    }

    /**
     * Write a packet to the socket.
     * @param packet The packet to write. Must be smaller than the buffer size.
     */
    #writeOne(packet: Uint8Array) {
        // `#combiner` will reuse the buffer, so we need to use the Consumable pattern
        return Consumable.WritableStream.write(this.#writer, packet);
    }

    async flush() {
        const buffer = this.#combiner.flush();
        if (buffer) {
            try {
                await this.#writeLock.wait();
                await this.#writeOne(buffer);
            } finally {
                this.#writeLock.notifyOne();
            }
        }
    }

    async #write(data: Uint8Array) {
        for (const buffer of this.#combiner.push(data)) {
            await this.#writeOne(buffer);
        }
    }

    async write(data: Uint8Array) {
        try {
            await this.#writeLock.wait();
            await this.#write(data);
        } finally {
            this.#writeLock.notifyOne();
        }
    }

    async writeRequest(id: number, value: number | string | Uint8Array) {
        if (typeof value === "number") {
            await this.#write(NumberRequest.serialize({ id, arg: value }));
            return;
        }

        if (typeof value === "string") {
            value = encodeUtf8(value);
        }

        await this.#write(NumberRequest.serialize({ id, arg: value.length }));
        await this.#write(value);
    }

    async readExactly(length: number) {
        // The request may still be in the internal buffer.
        // Call `flush` to send it before starting reading
        await this.flush();
        return await this.#readable.readExactly(length);
    }

    async readResponse<T>(id: number, type: StructDeserializer<T>) {
        const buffer = await this.readExactly(4);
        switch (getUint32LittleEndian(buffer, 0)) {
            case ResponseId.Fail:
                await FailResponse.deserialize(this.#readable);
                unreachable();
            case id:
                return await type.deserialize(this.#readable);
            default:
                throw new Error(
                    `Expected '${id}', but got '${decodeUtf8(buffer)}'`,
                );
        }
    }

    async *readResponses<T>(
        id: number,
        type: StructDeserializer<T>,
    ): AsyncGenerator<T, void, void> {
        await this.flush();

        while (true) {
            const buffer = await this.#readable.readExactly(4);
            switch (getUint32LittleEndian(buffer, 0)) {
                case ResponseId.Fail:
                    await FailResponse.deserialize(this.#readable);
                    unreachable();
                case ResponseId.Done:
                    // `DONE` responses' size are always same as the request's normal response.
                    //
                    // For example, `DONE` responses for `LIST` requests are 16 bytes (same as `DENT` responses),
                    // but `DONE` responses for `STAT` requests are 12 bytes (same as `STAT` responses).
                    await this.#readable.readExactly(type.size);
                    return;
                case id:
                    yield await type.deserialize(this.#readable);
                    break;
                default:
                    throw new Error(
                        `Expected '${id}' or '${ResponseId.Done}', but got '${decodeUtf8(buffer)}'`,
                    );
            }
        }
    }

    async close() {
        this.clearIdleTimer();
        await this.#readable.cancel();
        await this.#socket.close();
    }
}
