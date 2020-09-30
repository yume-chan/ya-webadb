import { AutoResetEvent, EventQueue } from '../utils';
import { AdbStreamBase } from './controller';
import { AdbStream } from './stream';

export class AdbReadableStream implements AdbStreamBase {
    private stream: AdbStream;

    private queue: EventQueue<ArrayBuffer>;

    private readLock = new AutoResetEvent();

    public get backend() { return this.stream.backend; }

    public get localId() { return this.stream.localId; }

    public get remoteId() { return this.stream.remoteId; }

    public constructor(stream: AdbStream) {
        this.stream = stream;
        this.queue = new EventQueue<ArrayBuffer>({
            highWaterMark: 16 * 1024,
        });

        const resetEvent = new AutoResetEvent(true);

        this.stream.onData(buffer => {
            if (!this.queue.push(buffer, buffer.byteLength)) {
                return resetEvent.wait();
            }
            return;
        });
        this.stream.onClose(() => {
            this.queue.end();
        });

        this.queue.onLowWater(() => {
            resetEvent.notify();
        });
    }

    public async read(): Promise<ArrayBuffer> {
        await this.readLock.wait();

        try {
            return await this.queue.next();
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
