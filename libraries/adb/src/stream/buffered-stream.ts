import { StructAsyncDeserializeStream, ValueOrPromise } from '@yume-chan/struct';
import { AdbSocket, AdbSocketInfo } from '../socket';
import { AdbSocketStream } from './stream';

export class StreamEndedError extends Error {
    public constructor() {
        super('Stream ended');

        // Fix Error's prototype chain when compiling to ES5
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export interface Stream {
    /**
     * When the stream is ended (no more data can be read),
     * An `StreamEndedError` should be thrown.
     *
     * @param length A hint of how much data should be read.
     * @returns Data, which can be either more or less than `length`.
     */
    read(length: number): ValueOrPromise<ArrayBuffer>;

    close?(): void;
}

export class BufferedStream<T extends Stream> {
    private buffer: Uint8Array | undefined;

    protected readonly stream: T;

    public constructor(stream: T) {
        this.stream = stream;
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
            const buffer = await this.stream.read(length);
            if (buffer.byteLength === length) {
                return buffer;
            }

            if (buffer.byteLength > length) {
                this.buffer = new Uint8Array(buffer, length);
                return buffer.slice(0, length);
            }

            array = new Uint8Array(length);
            array.set(new Uint8Array(buffer), 0);
            index = buffer.byteLength;
        }

        try {
            while (index < length) {
                const left = length - index;

                const buffer = await this.stream.read(left);
                if (buffer.byteLength > left) {
                    array.set(new Uint8Array(buffer, 0, left), index);
                    this.buffer = new Uint8Array(buffer, left);
                    return array.buffer;
                }

                array.set(new Uint8Array(buffer), index);
                index += buffer.byteLength;
            }
        }
        catch (e) {
            if (readToEnd && e instanceof StreamEndedError) {
                return array.buffer;
            }

            throw e;
        }

        return array.buffer;
    }

    public close() {
        this.stream.close?.();
    }
}

export class AdbBufferedStream
    extends BufferedStream<AdbSocketStream>
    implements AdbSocketInfo, StructAsyncDeserializeStream {
    public get backend() { return this.stream.backend; }
    public get localId() { return this.stream.localId; }
    public get remoteId() { return this.stream.remoteId; }
    public get localCreated() { return this.stream.localCreated; }
    public get serviceString() { return this.stream.serviceString; }

    public constructor(socket: AdbSocket) {
        super(new AdbSocketStream(socket));
    }

    public write(data: ArrayBuffer): Promise<void> {
        return this.stream.write(data);
    }
}
