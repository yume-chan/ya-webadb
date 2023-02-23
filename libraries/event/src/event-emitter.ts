import type { Disposable } from "./disposable.js";
import type { EventListener, RemoveEventListener } from "./event.js";

export interface EventListenerInfo<TEvent, TResult = unknown> {
    listener: EventListener<TEvent, unknown, unknown[], TResult>;

    thisArg: unknown;

    args: unknown[];
}

export interface AddEventListener<TEvent, TResult = unknown> {
    (
        listener: EventListener<TEvent, unknown, [], TResult>
    ): RemoveEventListener;
    <TThis, TArgs extends unknown[]>(
        listener: EventListener<TEvent, TThis, TArgs, TResult>,
        thisArg: TThis,
        ...args: TArgs
    ): RemoveEventListener;
}

export class EventEmitter<TEvent, TResult = unknown> implements Disposable {
    protected readonly listeners: EventListenerInfo<TEvent, TResult>[] = [];

    public constructor() {
        this.event = this.event.bind(this);
    }

    protected addEventListener(
        info: EventListenerInfo<TEvent, TResult>
    ): RemoveEventListener {
        this.listeners.push(info);

        const remove: RemoveEventListener = () => {
            const index = this.listeners.indexOf(info);
            if (index !== -1) {
                this.listeners.splice(index, 1);
            }
        };
        remove.dispose = remove;
        return remove;
    }

    public event: AddEventListener<TEvent, TResult> = <
        TThis,
        TArgs extends unknown[]
    >(
        listener: EventListener<TEvent, TThis, TArgs, TResult>,
        thisArg?: TThis,
        ...args: TArgs
    ) => {
        const info: EventListenerInfo<TEvent, TResult> = {
            listener: listener as EventListener<
                TEvent,
                unknown,
                unknown[],
                TResult
            >,
            thisArg,
            args,
        };
        return this.addEventListener(info);
    };

    public fire(e: TEvent) {
        for (const info of this.listeners.slice()) {
            info.listener.apply(info.thisArg, [e, ...info.args]);
        }
    }

    public dispose() {
        this.listeners.length = 0;
    }
}
