import { AutoDisposable } from '@yume-chan/event';
import { AdbBackend } from '../backend';
import { AdbCommand } from '../packet';
import { AutoResetEvent, chunkArrayLike } from '../utils';
import { CloseEventEmitter } from './close-event-emitter';
import { DataEventEmitter } from './data-event-emitter';
import { AdbPacketDispatcher } from './dispatcher';

export interface AdbSocketInfo {
    backend: AdbBackend;

    localId: number;

    remoteId: number;

    localCreated: boolean;

    serviceString: string;
}

export interface AdbSocketConstructionOptions {
    dispatcher: AdbPacketDispatcher;

    localId: number;

    remoteId: number;

    localCreated: boolean;

    serviceString: string;
}

export class AdbSocketController extends AutoDisposable implements AdbSocketInfo {
    private readonly writeChunkLock = this.addDisposable(new AutoResetEvent());
    private readonly writeLock = this.addDisposable(new AutoResetEvent());

    private readonly dispatcher!: AdbPacketDispatcher;
    public get backend() { return this.dispatcher.backend; }

    public readonly localId!: number;
    public readonly remoteId!: number;
    public readonly localCreated!: boolean;
    public readonly serviceString!: string;

    public readonly dataEvent = this.addDisposable(new DataEventEmitter<ArrayBuffer>());

    private _closed = false;
    public get closed() { return this._closed; }

    private readonly closeEvent = this.addDisposable(new CloseEventEmitter());
    public get onClose() { return this.closeEvent.event; }

    public constructor(options: AdbSocketConstructionOptions) {
        super();
        Object.assign(this, options);
    }

    private async writeChunk(data: ArrayBuffer): Promise<void> {
        try {
            // Wait for an ack packet
            await this.writeChunkLock.wait();
        } catch {
            // Lock has been disposed, which means the socket has been closed
            throw new Error('Can not write after closed');
        }

        await this.dispatcher.sendPacket(AdbCommand.Write, this.localId, this.remoteId, data);
    }

    public async write(data: ArrayBuffer): Promise<void> {
        try {
            // Keep write operations in order
            await this.writeLock.wait();
        } catch {
            // Lock has been disposed, which means the socket has been closed
            throw new Error('Can not write after closed');
        }

        for await (const chunk of chunkArrayLike(data, this.dispatcher.maxPayloadSize)) {
            await this.writeChunk(chunk);
        }
        this.writeLock.notify();
    }

    public ack() {
        this.writeChunkLock.notify();
    }

    public async close(): Promise<void> {
        if (!this._closed) {
            // Immediately cancel all pending writes
            this.writeLock.dispose();
            this.writeChunkLock.dispose();

            await this.dispatcher.sendPacket(AdbCommand.Close, this.localId, this.remoteId);
            this._closed = true;
        }
    }

    public dispose() {
        this._closed = true;
        this.closeEvent.fire();
        super.dispose();
    }
}
