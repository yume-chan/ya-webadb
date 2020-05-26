import { PromiseResolver } from '@yume-chan/async-operation-manager';
import { WebAdb } from './webadb';
import { IEvent } from 'xterm';

interface IListener<T, U = void> {
    (arg1: T, arg2: U): void;
}

export interface IEventEmitter<T, U = void> {
    event: IEvent<T, U>;
    fire(arg1: T, arg2: U): void;
    dispose(): void;
}

export class EventEmitter<T, U = void> implements IEventEmitter<T, U> {
    private _listeners: IListener<T, U>[] = [];
    private _event?: IEvent<T, U>;
    private _disposed: boolean = false;

    public get event(): IEvent<T, U> {
        if (!this._event) {
            this._event = (listener: (arg1: T, arg2: U) => any) => {
                this._listeners.push(listener);
                const disposable = {
                    dispose: () => {
                        if (!this._disposed) {
                            for (let i = 0; i < this._listeners.length; i++) {
                                if (this._listeners[i] === listener) {
                                    this._listeners.splice(i, 1);
                                    return;
                                }
                            }
                        }
                    }
                };
                return disposable;
            };
        }
        return this._event;
    }

    public fire(arg1: T, arg2: U): void {
        const queue: IListener<T, U>[] = [];
        for (let i = 0; i < this._listeners.length; i++) {
            queue.push(this._listeners[i]);
        }
        for (let i = 0; i < queue.length; i++) {
            queue[i].call(undefined, arg1, arg2);
        }
    }

    public dispose(): void {
        if (this._listeners) {
            this._listeners.length = 0;
        }
        this._disposed = true;
    }
}

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
    public get onData(): IEvent<ArrayBuffer> { return this.onDataEvent.event; }

    public onCloseEvent: EventEmitter<void> = new EventEmitter();
    public get onClose(): IEvent<void> { return this.onCloseEvent.event; }

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

    public ack(): void {
        this._writeMutex.notify();
    }
}
