import type { WritableStreamDefaultWriter } from "@yume-chan/stream-extra";
import { BufferedReadableStream } from "@yume-chan/stream-extra";
import type { StructAsyncDeserializeStream } from "@yume-chan/struct";

import type { AdbSocket } from "../../index.js";
import { AutoResetEvent } from "../../index.js";

export class AdbSyncSocketLocked implements StructAsyncDeserializeStream {
    private _writer: WritableStreamDefaultWriter<Uint8Array>;
    private _readable: BufferedReadableStream;
    private _bufferSize: number;
    private _buffered: Uint8Array[] = [];
    private _bufferedLength = 0;
    private _lock: AutoResetEvent;

    public constructor(
        writer: WritableStreamDefaultWriter<Uint8Array>,
        readable: BufferedReadableStream,
        bufferSize: number,
        lock: AutoResetEvent
    ) {
        this._writer = writer;
        this._readable = readable;
        this._bufferSize = bufferSize;
        this._lock = lock;
    }

    public async flush(hard: boolean) {
        if (this._bufferedLength === 0) {
            return;
        }

        if (!hard && this._bufferedLength < this._bufferSize) {
            return;
        }

        if (this._buffered.length === 1) {
            await this._writer.write(this._buffered[0]!);
            this._buffered.length = 0;
            this._bufferedLength = 0;
            return;
        }

        if (hard) {
            const data = new Uint8Array(this._bufferedLength);
            let offset = 0;
            for (const chunk of this._buffered) {
                data.set(chunk, offset);
                offset += chunk.byteLength;
            }
            this._buffered.length = 0;
            this._bufferedLength = 0;
            // Let AdbSocket chunk the data for us
            await this._writer.write(data);
        } else {
            while (this._bufferedLength >= this._bufferSize) {
                const data = new Uint8Array(this._bufferSize);
                let offset = 0;
                let available = this._bufferSize;
                while (offset < this._bufferSize) {
                    const chunk = this._buffered[0]!;
                    if (chunk.byteLength <= available) {
                        data.set(chunk, offset);
                        offset += chunk.byteLength;
                        available -= chunk.byteLength;
                        this._buffered.shift();
                        this._bufferedLength -= chunk.byteLength;
                    } else {
                        data.set(chunk.subarray(0, available), offset);
                        this._buffered[0] = chunk.subarray(available);
                        this._bufferedLength -= available;
                        break;
                    }
                }
                await this._writer.write(data);
            }
        }
    }

    public async write(data: Uint8Array) {
        this._buffered.push(data);
        this._bufferedLength += data.byteLength;
        await this.flush(false);
    }

    public async read(length: number) {
        await this.flush(true);
        return await this._readable.read(length);
    }

    public release(): void {
        this._buffered.length = 0;
        this._bufferedLength = 0;
        this._lock.notifyOne();
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
