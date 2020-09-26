import { DisposableList } from '@yume-chan/event';
import { AutoResetEvent, EventIterable } from '../utils';
import { AdbStreamBase } from './controller';
import { AdbStream } from './stream';

export class AdbReadableStream implements AdbStreamBase {
    private stream: AdbStream;

    private iterable: AsyncIterable<ArrayBuffer>;

    private readLock = new AutoResetEvent();

    public get backend() { return this.stream.backend; }

    public get localId() { return this.stream.localId; }

    public get remoteId() { return this.stream.remoteId; }

    public constructor(stream: AdbStream) {
        this.stream = stream;
        this.iterable = new EventIterable<ArrayBuffer>(controller => {
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
        }, {
            maxConsumerCount: 1,
            autoCleanup: false,
        });
    }

    public async read(): Promise<ArrayBuffer> {
        await this.readLock.wait();

        try {
            for await (const buffer of this.iterable) {
                return buffer;
            }
            throw new Error('The stream has been closed');
        } finally {
            this.readLock.notify();
        }
    }

    public async readAll(): Promise<string> {
        await this.readLock.wait();

        try {
            let output = '';
            for await (const buffer of this.iterable) {
                output += this.stream.backend.decodeUtf8(buffer);
            }
            return output;
        } finally {
            this.readLock.notify();
        }
    }

    public write(data: ArrayBuffer): Promise<void> {
        return this.stream.write(data);
    }

    close(): void {
        this.stream.close();
    }
}
