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
    get backend() { return this.dispatcher.backend; }

    readonly localId!: number;
    readonly remoteId!: number;
    readonly localCreated!: boolean;
    readonly serviceString!: string;

    readonly dataEvent = this.addDisposable(new DataEventEmitter<ArrayBuffer>());

    private _closed = false;
    get closed() { return this._closed; }

    private readonly closeEvent = this.addDisposable(new CloseEventEmitter());
    get onClose() { return this.closeEvent.event; }

    constructor(options: AdbSocketConstructionOptions) {
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

    async write(data: ArrayBuffer): Promise<void> {
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

    ack() {
        this.writeChunkLock.notify();
    }

    async close(): Promise<void> {
        if (!this._closed) {
            // Immediately cancel all pending writes
            this.writeLock.dispose();
            this.writeChunkLock.dispose();

            await this.dispatcher.sendPacket(AdbCommand.Close, this.localId, this.remoteId);
            this._closed = true;
        }
    }

    dispose() {
        this._closed = true;
        this.closeEvent.fire();
        super.dispose();
    }
}
