import { AsyncEventEmitter, AutoDisposable, EventEmitter } from '@yume-chan/event';
import { AdbBackend } from '../backend';
import { AdbCommand } from '../packet';
import { AutoResetEvent } from '../utils';
import { chunkArrayLike } from './chunk';
import { AdbPacketDispatcher } from './dispatcher';

export interface AdbStreamBase {
    backend: AdbBackend;

    localId: number;

    remoteId: number;
}

export class AdbStreamController extends AutoDisposable implements AdbStreamBase {
    private readonly writeChunkLock = this.addDisposable(new AutoResetEvent());

    private readonly writeLock = this.addDisposable(new AutoResetEvent());

    public readonly dispatcher: AdbPacketDispatcher;

    public get backend() { return this.dispatcher.backend; }

    public readonly localId: number;

    public readonly remoteId: number;

    public readonly dataEvent = this.addDisposable(new AsyncEventEmitter<ArrayBuffer>());

    private _closed = false;

    public get closed() { return this._closed; }

    private readonly closeEvent = this.addDisposable(new EventEmitter<void>());

    public get onClose() { return this.closeEvent.event; }

    public constructor(localId: number, remoteId: number, dispatcher: AdbPacketDispatcher) {
        super();

        this.localId = localId;
        this.remoteId = remoteId;
        this.dispatcher = dispatcher;
    }

    private async writeChunk(data: ArrayBuffer): Promise<void> {
        if (this._closed) {
            throw new Error('Can not write after closed');
        }

        // Wait for an ack packet
        await this.writeChunkLock.wait();
        await this.dispatcher.sendPacket(AdbCommand.Write, this.localId, this.remoteId, data);
    }

    public async write(data: ArrayBuffer): Promise<void> {
        // Keep write operations in order
        await this.writeLock.wait();
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
