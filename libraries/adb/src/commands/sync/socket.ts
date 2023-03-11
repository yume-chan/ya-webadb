import type { WritableStreamDefaultWriter } from "@yume-chan/stream-extra";
import { BufferedReadableStream, Consumable } from "@yume-chan/stream-extra";
import type { StructAsyncDeserializeStream } from "@yume-chan/struct";

import type { AdbSocket } from "../../index.js";
import { AutoResetEvent } from "../../index.js";

export class AdbSyncSocketLocked implements StructAsyncDeserializeStream {
    private readonly _writer: WritableStreamDefaultWriter<
        Consumable<Uint8Array>
    >;
    private readonly _readable: BufferedReadableStream;
    private readonly _bufferCapacity: number;
    private readonly _socketLock: AutoResetEvent;
    private readonly _writeLock = new AutoResetEvent();
    private readonly _writeBuffer: Uint8Array;
    private _writeBufferOffset = 0;
    private _writeBufferAvailable;

    public constructor(
        writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>,
        readable: BufferedReadableStream,
        bufferSize: number,
        lock: AutoResetEvent
    ) {
        this._writer = writer;
        this._readable = readable;
        this._bufferCapacity = bufferSize;
        this._socketLock = lock;
        this._writeBuffer = new Uint8Array(bufferSize);
        this._writeBufferAvailable = bufferSize;
    }

    private async writeInnerStream(buffer: Uint8Array) {
        const output = new Consumable(buffer);
        await this._writer.write(output);
        await output.consumed;
    }

    public async flush() {
        try {
            await this._writeLock.wait();
            if (this._writeBufferOffset === 0) {
                return;
            }

            await this.writeInnerStream(
                this._writeBuffer.subarray(0, this._writeBufferOffset)
            );
            this._writeBufferOffset = 0;
            this._writeBufferAvailable = this._bufferCapacity;
        } finally {
            this._writeLock.notifyOne();
        }
    }

    public async write(data: Uint8Array) {
        try {
            await this._writeLock.wait();
            let offset = 0;
            let available = data.byteLength;
            if (this._writeBufferOffset !== 0) {
                if (available >= this._writeBufferAvailable) {
                    this._writeBuffer.set(
                        data.subarray(0, this._writeBufferAvailable),
                        this._writeBufferOffset
                    );
                    offset += this._writeBufferAvailable;
                    available -= this._writeBufferAvailable;

                    await this.writeInnerStream(this._writeBuffer);
                    this._writeBufferOffset = 0;
                    this._writeBufferAvailable = this._bufferCapacity;

                    if (available === 0) {
                        return;
                    }
                } else {
                    this._writeBuffer.set(data, this._writeBufferOffset);
                    this._writeBufferOffset += available;
                    this._writeBufferAvailable -= available;
                    return;
                }
            }

            while (available >= this._bufferCapacity) {
                const end = offset + this._bufferCapacity;
                await this.writeInnerStream(data.subarray(offset, end));
                offset = end;
                available -= this._bufferCapacity;
            }

            if (available > 0) {
                this._writeBuffer.set(
                    data.subarray(offset),
                    this._writeBufferOffset
                );
                this._writeBufferOffset += available;
                this._writeBufferAvailable -= available;
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
        this._writeBufferOffset = 0;
        this._writeBufferAvailable = this._bufferCapacity;
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
