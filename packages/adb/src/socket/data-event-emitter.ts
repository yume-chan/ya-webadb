import { PromiseResolver } from '@yume-chan/async-operation-manager';
import { Event, EventEmitter, EventListenerInfo } from '@yume-chan/event';
import { ValueOrPromise } from '@yume-chan/struct';

export type AsyncEventResult = ValueOrPromise<void>;

export type AsyncEvent<TEvent> = Event<TEvent, AsyncEventResult>;

export class DataEventEmitter<TEvent> extends EventEmitter<TEvent, AsyncEventResult> {
    private dispatchLock = new PromiseResolver<void>();

    protected addEventListener(info: EventListenerInfo<TEvent, AsyncEventResult>) {
        const remove = super.addEventListener(info);
        if (this.listeners.length === 1) {
            this.dispatchLock.resolve();
        }
        return remove;
    }

    public async fire(e: TEvent) {
        await this.dispatchLock.promise;

        for (const info of this.listeners) {
            await info.listener.apply(info.thisArg, [e, ...info.args]);
        }
    }
}
