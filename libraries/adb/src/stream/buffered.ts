import type { StructAsyncDeserializeStream } from '@yume-chan/struct';
import type { AdbSocket, AdbSocketInfo } from '../socket';
import type { ReadableStream, ReadableStreamDefaultReader } from './detect';
import { PushReadableStream } from "./transform";

export class BufferedStreamEndedError extends Error {
    public constructor() {
        super('Stream ended');

        // Fix Error's prototype chain when compiling to ES5
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class BufferedStream {
    private buffer: Uint8Array | undefined;

    protected readonly stream: ReadableStream<Uint8Array>;

    protected readonly reader: ReadableStreamDefaultReader<Uint8Array>;

    public constructor(stream: ReadableStream<Uint8Array>) {
        this.stream = stream;
        this.reader = stream.getReader();
    }

    /**
     *
     * @param length
     * @returns
     */
    public async read(length: number): Promise<Uint8Array> {
        let array: Uint8Array;
        let index: number;
        if (this.buffer) {
            const buffer = this.buffer;
            if (buffer.byteLength > length) {
                this.buffer = buffer.subarray(length);
                return buffer.subarray(0, length);
            }

            array = new Uint8Array(length);
            array.set(buffer);
            index = buffer.byteLength;
            this.buffer = undefined;
        } else {
            const { done, value } = await this.reader.read();
            if (done) {
                throw new Error('Unexpected end of stream');
            }

            if (value.byteLength === length) {
                return value;
            }

            if (value.byteLength > length) {
                this.buffer = value.subarray(length);
                return value.subarray(0, length);
            }

            array = new Uint8Array(length);
            array.set(value);
            index = value.byteLength;
        }

        while (index < length) {
            const left = length - index;

            const { done, value } = await this.reader.read();
            if (done) {
                throw new Error('Unexpected end of stream');
            }

            if (value.byteLength === left) {
                array.set(value, index);
                return array;
            }

            if (value.byteLength > left) {
                array.set(value.subarray(0, left), index);
                this.buffer = value.subarray(left);
                return array;
            }

            array.set(value, index);
            index += value.byteLength;
        }

        return array;
    }

    /**
     * Return a readable stream with unconsumed data (if any) and
     * all data from the wrapped stream.
     * @returns A `ReadableStream`
     */
    public release(): ReadableStream<Uint8Array> {
        if (this.buffer) {
            return new PushReadableStream<Uint8Array>(async controller => {
                // Put the remaining data back to the stream
                await controller.enqueue(this.buffer!);

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

    public close() {
        this.reader.cancel();
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
