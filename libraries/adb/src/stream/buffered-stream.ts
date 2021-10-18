import { StructDeserializationContext } from '@yume-chan/struct';
import { AdbSocket, AdbSocketInfo } from '../socket';
import { AdbSocketStream } from './stream';

export interface Stream {
    /**
     * @param length A hint of how much data should be read.
     * @returns Data, which can be either more or less than `length`
     */
    read(length: number): ArrayBuffer | Promise<ArrayBuffer>;

    close?(): void;
}

export class BufferedStream<T extends Stream> {
    private buffer: Uint8Array | undefined;

    protected readonly stream: T;

    constructor(stream: T) {
        this.stream = stream;
    }

    async read(length: number): Promise<ArrayBuffer> {
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

        return array.buffer;
    }

    close() {
        this.stream.close?.();
    }
}

export class AdbBufferedStream
    extends BufferedStream<AdbSocketStream>
    implements AdbSocketInfo, StructDeserializationContext {
    get backend() { return this.stream.backend; }
    get localId() { return this.stream.localId; }
    get remoteId() { return this.stream.remoteId; }
    get localCreated() { return this.stream.localCreated; }
    get serviceString() { return this.stream.serviceString; }

    constructor(socket: AdbSocket) {
        super(new AdbSocketStream(socket));
    }

    write(data: ArrayBuffer): Promise<void> {
        return this.stream.write(data);
    }

    decodeUtf8(buffer: ArrayBuffer): string {
        return this.backend.decodeUtf8(buffer);
    }

    encodeUtf8(input: string): ArrayBuffer {
        return this.backend.encodeUtf8(input);
    }
}
