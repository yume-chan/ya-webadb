import { once } from '@yume-chan/event';
import { ValueOrPromise } from '@yume-chan/struct';
import { AdbSocket, AdbSocketInfo } from '../socket';
import { EventQueue } from '../utils';

export class AdbSocketStream implements AdbSocketInfo {
    private socket: AdbSocket;

    private queue: EventQueue<ArrayBuffer>;

    get backend() { return this.socket.backend; }
    get localId() { return this.socket.localId; }
    get remoteId() { return this.socket.remoteId; }
    get localCreated() { return this.socket.localCreated; }
    get serviceString() { return this.socket.serviceString; }

    constructor(socket: AdbSocket) {
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

    async read(): Promise<ArrayBuffer> {
        try {
            return await this.queue.dequeue();
        } catch {
            throw new Error('Can not read after AdbSocketStream has been closed');
        }
    }

    write(data: ArrayBuffer): Promise<void> {
        return this.socket.write(data);
    }

    close(): void {
        this.socket.close();
    }
}
