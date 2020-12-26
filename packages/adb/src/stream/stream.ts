import { AdbSocket, AdbSocketInfo } from '../socket';
import { AutoResetEvent, EventQueue } from '../utils';

export class AdbSocketStream implements AdbSocketInfo {
    private socket: AdbSocket;

    private queue: EventQueue<ArrayBuffer>;

    private readLock = new AutoResetEvent();

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

        const resetEvent = new AutoResetEvent(true);

        this.socket.onData(buffer => {
            if (!this.queue.push(buffer, buffer.byteLength)) {
                return resetEvent.wait();
            }
            return;
        });
        this.socket.onClose(() => {
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
        } catch {
            throw new Error('Can not read after AdbSocketStream has been closed');
        } finally {
            this.readLock.notify();
        }
    }

    public write(data: ArrayBuffer): Promise<void> {
        return this.socket.write(data);
    }

    close(): void {
        this.socket.close();
    }
}
