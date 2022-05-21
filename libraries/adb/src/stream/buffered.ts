import type { StructAsyncDeserializeStream } from '@yume-chan/struct';
import type { AdbSocket, AdbSocketInfo } from '../socket/index.js';
import type { ReadableStream, ReadableStreamDefaultReader } from './detect.js';
import { PushReadableStream } from "./transform.js";

export class BufferedStreamEndedError extends Error {
    public constructor() {
        super('Stream ended');

        // Fix Error's prototype chain when compiling to ES5
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class BufferedStream {
    private buffered: Uint8Array | undefined;
    private bufferedOffset = 0;
    private bufferedLength = 0;

    protected readonly stream: ReadableStream<Uint8Array>;

    protected readonly reader: ReadableStreamDefaultReader<Uint8Array>;

    public constructor(stream: ReadableStream<Uint8Array>) {
        this.stream = stream;
        this.reader = stream.getReader();
    }

    private async readSource() {
        const { done, value } = await this.reader.read();
        if (done) {
            throw new BufferedStreamEndedError();
        }
        return value;
    }

    private async readAsync(length: number, initial?: Uint8Array) {
        let result: Uint8Array;
        let index: number;

        if (initial) {
            result = new Uint8Array(length);
            result.set(initial);
            index = initial.byteLength;
            length -= initial.byteLength;
        } else {
            const array = await this.readSource();
            if (array.byteLength === length) {
                return array;
            }

            if (array.byteLength > length) {
                this.buffered = array;
                this.bufferedOffset = length;
                this.bufferedLength = array.byteLength - length;
                return array.subarray(0, length);
            }

            result = new Uint8Array(length);
            result.set(array);
            index = array.byteLength;
            length -= array.byteLength;
        }

        while (length > 0) {
            const array = await this.readSource();
            if (array.byteLength === length) {
                result.set(array, index);
                return result;
            }

            if (array.byteLength > length) {
                this.buffered = array;
                this.bufferedOffset = length;
                this.bufferedLength = array.byteLength - length;
                result.set(array.subarray(0, length), index);
                return result;
            }

            result.set(array, index);
            index += array.byteLength;
            length -= array.byteLength;
        }

        return result;
    }

    /**
     *
     * @param length
     * @returns
     */
    public read(length: number): Uint8Array | Promise<Uint8Array> {
        // PERF: Add a synchronous path for reading from internal buffer
        if (this.buffered) {
            const array = this.buffered;
            const offset = this.bufferedOffset;
            if (this.bufferedLength > length) {
                // PERF: `subarray` is slow
                // don't use it until absolutely necessary
                this.bufferedOffset += length;
                this.bufferedLength -= length;
                return array.subarray(offset, offset + length);
            }

            this.buffered = undefined;
            return this.readAsync(length, array.subarray(offset));
        }

        return this.readAsync(length);
    }

    /**
     * Return a readable stream with unconsumed data (if any) and
     * all data from the wrapped stream.
     * @returns A `ReadableStream`
     */
    public release(): ReadableStream<Uint8Array> {
        if (this.buffered) {
            return new PushReadableStream<Uint8Array>(async controller => {
                // Put the remaining data back to the stream
                await controller.enqueue(this.buffered!);

                // Manually pipe the stream
                while (true) {
                    try {
                        const { done, value } = await this.reader.read();
                        if (done) {
                            controller.close();
                            break;
                        } else {
                            await controller.enqueue(value);
                        }
                    } catch (e) {
                        controller.error(e);
                        break;
                    }
                }
            });
        } else {
            // Simply release the reader and return the stream
            this.reader.releaseLock();
            return this.stream;
        }
    }

    public async close() {
        await this.reader.cancel();
    }
}

export class AdbBufferedStream
    extends BufferedStream
    implements AdbSocketInfo, StructAsyncDeserializeStream {
    protected readonly socket: AdbSocket;

    public get localId() { return this.socket.localId; }
    public get remoteId() { return this.socket.remoteId; }
    public get localCreated() { return this.socket.localCreated; }
    public get serviceString() { return this.socket.serviceString; }

    public get writable() { return this.socket.writable; }

    public constructor(socket: AdbSocket) {
        super(socket.readable);
        this.socket = socket;
    }
}
