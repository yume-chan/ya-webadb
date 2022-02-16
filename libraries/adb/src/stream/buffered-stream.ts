import { StructAsyncDeserializeStream } from '@yume-chan/struct';
import { AdbSocket, AdbSocketInfo } from '../socket';
import { ReadableStream, ReadableStreamDefaultReader } from '../utils';

export class BufferedStreamEndedError extends Error {
    public constructor() {
        super('Stream ended');

        // Fix Error's prototype chain when compiling to ES5
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class BufferedStream {
    private buffer: Uint8Array | undefined;

    protected readonly stream: ReadableStream<ArrayBuffer>;

    protected readonly reader: ReadableStreamDefaultReader<ArrayBuffer>;

    public constructor(stream: ReadableStream<ArrayBuffer>) {
        this.stream = stream;
        this.reader = stream.getReader();
    }

    /**
     *
     * @param length
     * @param readToEnd When `true`, allow less data to be returned if the stream has reached its end.
     * @returns
     */
    public async read(length: number, readToEnd: boolean = false): Promise<ArrayBuffer> {
        let array: Uint8Array;
        let index: number;
        if (this.buffer) {
            const buffer = this.buffer;
            if (buffer.byteLength > length) {
                this.buffer = buffer.subarray(length);
                return buffer.slice(0, length).buffer;
            }

            array = new Uint8Array(length);
            array.set(buffer);
            index = buffer.byteLength;
            this.buffer = undefined;
        } else {
            const result = await this.reader.read();
            if (result.done) {
                if (readToEnd) {
                    return new ArrayBuffer(0);
                } else {
                    throw new Error('Unexpected end of stream');
                }
            }

            const { value } = result;
            if (value.byteLength === length) {
                return value;
            }

            if (value.byteLength > length) {
                this.buffer = new Uint8Array(value, length);
                return value.slice(0, length);
            }

            array = new Uint8Array(length);
            array.set(new Uint8Array(value), 0);
            index = value.byteLength;
        }

        while (index < length) {
            const left = length - index;

            const result = await this.reader.read();
            if (result.done) {
                if (readToEnd) {
                    return new ArrayBuffer(0);
                } else {
                    throw new Error('Unexpected end of stream');
                }
            }

            const { value } = result;
            if (value.byteLength > left) {
                array.set(new Uint8Array(value, 0, left), index);
                this.buffer = new Uint8Array(value, left);
                return array.buffer;
            }

            array.set(new Uint8Array(value), index);
            index += value.byteLength;
        }

        return array.buffer;
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
