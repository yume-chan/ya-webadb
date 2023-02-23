import { PushReadableStream } from "./push-readable.js";
import type { ReadableStream, ReadableStreamDefaultReader } from "./stream.js";

export class BufferedReadableStreamEndedError extends Error {
    public constructor() {
        super("Stream ended");

        // Fix Error's prototype chain when compiling to ES5
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class BufferedReadableStream {
    private buffered: Uint8Array | undefined;
    private bufferedOffset = 0;
    private bufferedLength = 0;

    private _position = 0;
    public get position() {
        return this._position;
    }

    protected readonly stream: ReadableStream<Uint8Array>;
    protected readonly reader: ReadableStreamDefaultReader<Uint8Array>;

    public constructor(stream: ReadableStream<Uint8Array>) {
        this.stream = stream;
        this.reader = stream.getReader();
    }

    private async readSource() {
        const { done, value } = await this.reader.read();
        if (done) {
            throw new BufferedReadableStreamEndedError();
        }
        this._position += value.byteLength;
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
            return new PushReadableStream<Uint8Array>(async (controller) => {
                // Put the remaining data back to the stream
                await controller.enqueue(this.buffered!);

                // Manually pipe the stream
                while (true) {
                    const { done, value } = await this.reader.read();
                    if (done) {
                        return;
                    } else {
                        await controller.enqueue(value);
                    }
                }
            });
        } else {
            // Simply release the reader and return the stream
            this.reader.releaseLock();
            return this.stream;
        }
    }

    public cancel(reason?: unknown) {
        return this.reader.cancel(reason);
    }
}
