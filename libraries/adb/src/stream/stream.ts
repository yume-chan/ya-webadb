import { once } from '@yume-chan/event';
import { ValueOrPromise } from '@yume-chan/struct';
import { AdbSocket, AdbSocketInfo } from '../socket';
import { EventQueue } from '../utils';

export class AdbSocketStream implements AdbSocketInfo {
    private socket: AdbSocket;

    private queue: EventQueue<ArrayBuffer>;

    public get backend() { return this.socket.backend; }
    public get localId() { return this.socket.localId; }
    public get remoteId() { return this.socket.remoteId; }
    public get localCreated() { return this.socket.localCreated; }
    public get serviceString() { return this.socket.serviceString; }

    public constructor(socket: AdbSocket) {
        this.socket = socket;

        this.queue = new EventQueue<ArrayBuffer>({
            highWaterMark: 16 * 1024,
        });

        this.socket.onData((buffer): ValueOrPromise<void> => {
            if (!this.queue.enqueue(buffer, buffer.byteLength)) {
                return once(this.queue.onDrain);
            }
        });

        this.socket.onClose(() => {
            this.queue.end();
        });
    }

    public async read(): Promise<ArrayBuffer> {
        try {
            return await this.queue.dequeue();
        } catch {
            throw new Error('Can not read after AdbSocketStream has been closed');
        }
    }

    public write(data: ArrayBuffer): Promise<void> {
        return this.socket.write(data);
    }

    close(): void {
        this.socket.close();
    }
}
