import { Disposable } from './disposable';
import { EventListener, RemoveEventListener } from './event';

interface EventListenerInfo<TEvent, TResult = unknown> {
    listener: EventListener<TEvent, any, any, TResult>;

    thisArg: unknown;

    args: unknown[];
}

export class EventEmitter<TEvent, TResult = unknown> implements Disposable {
    protected listeners: EventListenerInfo<TEvent, TResult>[] = [];

    public constructor() {
        this.event = this.event.bind(this);
    }

    public event(
        listener: EventListener<TEvent, unknown, [], TResult>
    ): RemoveEventListener;
    public event<TThis, TArgs extends unknown[]>(
        listener: EventListener<TEvent, TThis, TArgs, TResult>,
        thisArg: TThis,
        ...args: TArgs
    ): RemoveEventListener;
    public event<TThis, TArgs extends unknown[]>(
        listener: EventListener<TEvent, TThis, TArgs, TResult>,
        thisArg?: TThis,
        ...args: TArgs
    ): RemoveEventListener {
        const info: EventListenerInfo<TEvent, TResult> = {
            listener,
            thisArg,
            args,
        };
        this.listeners.push(info);

        const remove: RemoveEventListener = () => {
            const index = this.listeners.indexOf(info);
            if (index > 0) {
                this.listeners.splice(index, 1);
            }
        };
        remove.dispose = remove;
        return remove;
    }

    public fire(e: TEvent) {
        for (const info of this.listeners) {
            info.listener.apply(info.thisArg, [e, ...info.args]);
        }
    }

    public dispose() {
        this.listeners.length = 0;
    }
}
