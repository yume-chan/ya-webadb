import { PromiseResolver } from '@yume-chan/async-operation-manager';
import { WebAdb } from './webadb';
import { Event, EventEmitter } from '@yume-chan/event';

class AutoResetEvent {
    private _list: PromiseResolver<void>[] = [];

    private _blocking: boolean = false;

    public wait(): Promise<void> {
        if (!this._blocking) {
            this._blocking = true;

            if (this._list.length === 0) {
                return Promise.resolve();
            }
        }

        const resolver = new PromiseResolver<void>();
        this._list.push(resolver);
        return resolver.promise;
    }

    public notify() {
        if (this._list.length !== 0) {
            this._list.pop()!.resolve();
        } else {
            this._blocking = false;
        }
    }
}

export class AdbStream {
    private _writeMutex = new AutoResetEvent();

    public onDataEvent: EventEmitter<ArrayBuffer> = new EventEmitter();
    public get onData(): Event<ArrayBuffer> { return this.onDataEvent.event; }

    public onCloseEvent: EventEmitter<void> = new EventEmitter();
    public get onClose(): Event<void> { return this.onCloseEvent.event; }

    private _adb: WebAdb;

    public localId: number;

    public remoteId: number;

    public constructor(adb: WebAdb, localId: number, remoteId: number) {
        this._adb = adb;
        this.localId = localId;
        this.remoteId = remoteId;
    }

    public async write(data: ArrayBuffer): Promise<void> {
        await this._writeMutex.wait();
        await this._adb.sendMessage('WRTE', this.localId, this.remoteId, data);
    }

    public async close(): Promise<void> {
        await this._adb.sendMessage('CLSE', this.localId, this.remoteId);
    }

    public ack(): void {
        this._writeMutex.notify();
    }
}
