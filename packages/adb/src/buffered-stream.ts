import { DisposableList } from '@yume-chan/event';
import { AdbStream } from './stream';
import { AutoResetEvent, EventIterable } from './utils';

export class AdbBufferedStream implements AsyncIterable<ArrayBuffer>{
    private stream: AdbStream;

    public get backend() { return this.stream.backend; }

    public get localId() { return this.stream.localId; }

    public get remoteId() { return this.stream.remoteId; }

    private mode: 'none' | 'read' | 'iterate' = 'read';

    private readBuffer: ArrayBuffer | undefined;

    private readIterator: AsyncIterator<ArrayBuffer> | undefined;

    private extraBuffers: ArrayBuffer[] = [];

    public constructor(stream: AdbStream) {
        this.stream = stream;
    }

    public async read(length: number): Promise<ArrayBuffer> {
        if (this.mode !== 'none' && this.mode !== 'read') {
            throw new Error(`This BufferedStream is in ${this.mode} mode`);
        }

        if (!this.readIterator) {
            this.readIterator = this[Symbol.asyncIterator]();
        }

        this.mode = 'read';

        let array: Uint8Array;
        let index: number;
        if (this.readBuffer) {
            const buffer = this.readBuffer;
            if (buffer.byteLength > length) {
                this.readBuffer = buffer.slice(length);
                return buffer.slice(0, length);
            }

            array = new Uint8Array(length);
            array.set(new Uint8Array(buffer));
            index = buffer.byteLength;
            this.readBuffer = undefined;
        } else {
            array = new Uint8Array(length);
            index = 0;
        }

        while (index < length) {
            const result = await this.readIterator.next();
            if (result.done) {
                throw new Error('This BufferedStream has been closed');
            }

            const buffer = result.value;
            if (buffer.byteLength > length - index) {
                array.set(new Uint8Array(buffer.slice(0, length)), index);
                this.readBuffer = buffer.slice(length);
                return array.buffer;
            }

            array.set(new Uint8Array(buffer), index);
            index += buffer.byteLength;
        }

        return array.buffer;
    }

    public async readAll(): Promise<string> {
        let output = '';
        for await (const buffer of this) {
            output += this.stream.backend.decodeUtf8(buffer);
        }
        return output;
    }

    public write(data: ArrayBuffer): Promise<void> {
        return this.stream.write(data);
    }

    public close() {
        return this.stream.close();
    }

    public [Symbol.asyncIterator]() {
        if (this.readIterator) {
            this.readIterator.return?.();
            this.readIterator = undefined;
        }

        return new EventIterable<ArrayBuffer>(controller => {
            controller.maxConsumerCount = 1;

            for (const item of this.extraBuffers) {
                controller.push(item);
            }
            this.extraBuffers.length = 0;

            const disposable = new DisposableList();
            const resetEvent = new AutoResetEvent(true);
            disposable.add(this.stream.onData(buffer => {
                if (!controller.push(buffer)) {
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

            this.mode = 'iterate';

            return (buffers) => {
                this.extraBuffers = buffers;
                this.mode = 'none';
                disposable.dispose();
            };
        })[Symbol.asyncIterator]();
    }
}
