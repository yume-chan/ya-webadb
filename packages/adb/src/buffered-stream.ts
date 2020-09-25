import { DisposableList } from '@yume-chan/event';
import { AdbStream } from './stream';
import { AutoResetEvent, EventIterable } from './utils';

export interface Stream {
    /**
     * @param length A hint of how much data should be read.
     * @returns Data, which can be either more or less than `length`
     */
    read(length: number): ArrayBuffer | Promise<ArrayBuffer>;

    close?(): void;
}

export class BufferedStream<T extends Stream> {
    protected readonly stream: T;

    private buffer: Uint8Array | undefined;

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

export class AdbBufferedStream extends BufferedStream<AdbReadableStream> {
    public get backend() { return this.stream.backend; }

    public get localId() { return this.stream.localId; }

    public get remoteId() { return this.stream.remoteId; }

    public constructor(stream: AdbStream) {
        super(new AdbReadableStream(stream));
    }

    public write(data: ArrayBuffer): Promise<void> {
        return this.stream.write(data);
    }
}

export class AdbReadableStream {
    private stream: AdbStream;

    private iterator: AsyncIterator<ArrayBuffer> | undefined;

    public get backend() { return this.stream.backend; }

    public get localId() { return this.stream.localId; }

    public get remoteId() { return this.stream.remoteId; }

    public constructor(stream: AdbStream) {
        this.stream = stream;
    }

    public async read(): Promise<ArrayBuffer> {
        if (!this.iterator) {
            this.iterator = new EventIterable<ArrayBuffer>(controller => {
                controller.maxConsumerCount = 1;
                controller.highWaterMark = 16 * 1024;

                const disposable = new DisposableList();
                const resetEvent = new AutoResetEvent(true);
                disposable.add(this.stream.onData(buffer => {
                    if (!controller.push(buffer, buffer.byteLength)) {
                        return resetEvent.wait();
                    }
                    return;
                }));
                disposable.add(this.stream.onClose(() => {
                    controller.end();
                }));
                disposable.add(controller.onLowWater(() => {
                    resetEvent.notify();
                }));

                return () => {
                    disposable.dispose();
                };
            })[Symbol.asyncIterator]();
        }

        const result = await this.iterator.next();
        if (result.done) {
            return new ArrayBuffer(0);
        }

        return result.value;
    }

    public async readAll(): Promise<string> {
        let output = '';
        while (true) {
            const buffer = await this.read();
            if (buffer.byteLength === 0) {
                return output;
            }

            output += this.stream.backend.decodeUtf8(buffer);
        }
    }

    public write(data: ArrayBuffer): Promise<void> {
        return this.stream.write(data);
    }

    close(): void {
        this.iterator?.return?.();
        this.stream.close();
    }
}
