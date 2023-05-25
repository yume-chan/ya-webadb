import type {
    Consumable,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import {
    BufferCombiner,
    BufferedReadableStream,
    ConsumableWritableStream,
} from "@yume-chan/stream-extra";
import type { AsyncExactReadable } from "@yume-chan/struct";

import type { AdbSocket } from "../../adb.js";
import { AutoResetEvent } from "../../utils/index.js";

export class AdbSyncSocketLocked implements AsyncExactReadable {
    readonly #writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>;
    readonly #readable: BufferedReadableStream;
    readonly #socketLock: AutoResetEvent;
    readonly #writeLock = new AutoResetEvent();
    readonly #combiner: BufferCombiner;

    public get position() {
        return this.#readable.position;
    }

    public constructor(
        writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>,
        readable: BufferedReadableStream,
        bufferSize: number,
        lock: AutoResetEvent
    ) {
        this.#writer = writer;
        this.#readable = readable;
        this.#socketLock = lock;
        this.#combiner = new BufferCombiner(bufferSize);
    }

    private async writeInnerStream(buffer: Uint8Array) {
        await ConsumableWritableStream.write(this.#writer, buffer);
    }

    public async flush() {
        try {
            await this.#writeLock.wait();
            const buffer = this.#combiner.flush();
            if (buffer) {
                await this.writeInnerStream(buffer);
            }
        } finally {
            this.#writeLock.notifyOne();
        }
    }

    public async write(data: Uint8Array) {
        try {
            await this.#writeLock.wait();
            for (const buffer of this.#combiner.push(data)) {
                await this.writeInnerStream(buffer);
            }
        } finally {
            this.#writeLock.notifyOne();
        }
    }

    public async readExactly(length: number) {
        await this.flush();
        return await this.#readable.readExactly(length);
    }

    public release(): void {
        this.#combiner.flush();
        this.#socketLock.notifyOne();
    }
}

export class AdbSyncSocket {
    readonly #lock = new AutoResetEvent();
    readonly #socket: AdbSocket;
    readonly #locked: AdbSyncSocketLocked;

    public constructor(socket: AdbSocket, bufferSize: number) {
        this.#socket = socket;
        this.#locked = new AdbSyncSocketLocked(
            socket.writable.getWriter(),
            new BufferedReadableStream(socket.readable),
            bufferSize,
            this.#lock
        );
    }

    public async lock() {
        await this.#lock.wait();
        return this.#locked;
    }

    public async close() {
        await this.#socket.close();
    }
}
