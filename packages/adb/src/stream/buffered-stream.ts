import { StructDeserializationContext } from '@yume-chan/struct';
import { AdbStreamBase } from './controller';
import { AdbReadableStream } from './readable-stream';
import { AdbStream } from './stream';

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

    public constructor(stream: T) {
        this.stream = stream;
    }

    public async read(length: number): Promise<ArrayBuffer> {
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
            array = new Uint8Array(length);
            index = 0;
        }

        while (index < length) {
            const buffer = await this.stream.read(length - index);
            if (buffer.byteLength > length - index) {
                array.set(new Uint8Array(buffer, 0, length), index);
                this.buffer = new Uint8Array(buffer, length);
                return array.buffer;
            }

            array.set(new Uint8Array(buffer), index);
            index += buffer.byteLength;
        }

        return array.buffer;
    }

    public close() {
        this.stream.close?.();
    }
}

export class AdbBufferedStream
    extends BufferedStream<AdbReadableStream>
    implements AdbStreamBase, StructDeserializationContext {
    public get backend() { return this.stream.backend; }

    public get localId() { return this.stream.localId; }

    public get remoteId() { return this.stream.remoteId; }

    public constructor(stream: AdbStream) {
        super(new AdbReadableStream(stream));
    }

    public write(data: ArrayBuffer): Promise<void> {
        return this.stream.write(data);
    }

    public decodeUtf8(buffer: ArrayBuffer): string {
        return this.backend.decodeUtf8(buffer);
    }

    public encodeUtf8(input: string): ArrayBuffer {
        return this.backend.encodeUtf8(input);
    }
}
