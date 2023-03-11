import type {
    Consumable,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import {
    BufferCombiner,
    BufferedReadableStream,
    ConsumableWritableStream,
} from "@yume-chan/stream-extra";
import type { StructAsyncDeserializeStream } from "@yume-chan/struct";

import type { AdbSocket } from "../../index.js";
import { AutoResetEvent } from "../../index.js";

export class AdbSyncSocketLocked implements StructAsyncDeserializeStream {
    private readonly _writer: WritableStreamDefaultWriter<
        Consumable<Uint8Array>
    >;
    private readonly _readable: BufferedReadableStream;
    private readonly _socketLock: AutoResetEvent;
    private readonly _writeLock = new AutoResetEvent();
    private readonly _combiner: BufferCombiner;

    public constructor(
        writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>,
        readable: BufferedReadableStream,
        bufferSize: number,
        lock: AutoResetEvent
    ) {
        this._writer = writer;
        this._readable = readable;
        this._socketLock = lock;
        this._combiner = new BufferCombiner(bufferSize);
    }

    private async writeInnerStream(buffer: Uint8Array) {
        await ConsumableWritableStream.write(this._writer, buffer);
    }

    public async flush() {
        try {
            await this._writeLock.wait();
            const buffer = this._combiner.flush();
            if (buffer) {
                await this.writeInnerStream(buffer);
            }
        } finally {
            this._writeLock.notifyOne();
        }
    }

    public async write(data: Uint8Array) {
        try {
            await this._writeLock.wait();
            for (const buffer of this._combiner.push(data)) {
                await this.writeInnerStream(buffer);
            }
        } finally {
            this._writeLock.notifyOne();
        }
    }

    public async read(length: number) {
        await this.flush();
        return await this._readable.read(length);
    }

    public release(): void {
        this._combiner.flush();
        this._socketLock.notifyOne();
    }
}

export class AdbSyncSocket {
    private _lock = new AutoResetEvent();
    private _socket: AdbSocket;
    private _locked: AdbSyncSocketLocked;

    public constructor(socket: AdbSocket, bufferSize: number) {
        this._socket = socket;
        this._locked = new AdbSyncSocketLocked(
            socket.writable.getWriter(),
            new BufferedReadableStream(socket.readable),
            bufferSize,
            this._lock
        );
    }

    public async lock() {
        await this._lock.wait();
        return this._locked;
    }

    public async close() {
        await this._socket.close();
    }
}
