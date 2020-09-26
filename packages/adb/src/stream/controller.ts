import { AsyncEventEmitter, AutoDisposable, EventEmitter } from '@yume-chan/event';
import { AdbBackend } from '../backend';
import { AdbCommand } from '../packet';
import { AutoResetEvent } from '../utils';
import { AdbPacketDispatcher } from './dispatcher';

export interface AdbStreamBase {
    backend: AdbBackend;

    localId: number;

    remoteId: number;
}

export class AdbStreamController extends AutoDisposable implements AdbStreamBase {
    private readonly writeLock = this.addDisposable(new AutoResetEvent());

    public readonly dispatcher: AdbPacketDispatcher;

    public get backend() { return this.dispatcher.backend; }

    public readonly localId: number;

    public readonly remoteId: number;

    public readonly dataEvent = this.addDisposable(new AsyncEventEmitter<ArrayBuffer>());

    private readonly closeEvent = this.addDisposable(new EventEmitter<void>());

    public get onClose() { return this.closeEvent.event; }

    public constructor(localId: number, remoteId: number, dispatcher: AdbPacketDispatcher) {
        super();

        this.localId = localId;
        this.remoteId = remoteId;
        this.dispatcher = dispatcher;
    }

    public async write(data: ArrayBuffer): Promise<void> {
        await this.writeLock.wait();
        await this.dispatcher.sendPacket(AdbCommand.Write, this.localId, this.remoteId, data);
    }

    public ack() {
        this.writeLock.notify();
    }

    public close() {
        return this.dispatcher.sendPacket(AdbCommand.Close, this.localId, this.remoteId);
    }

    public dispose() {
        this.closeEvent.fire();
        super.dispose();
    }
}
