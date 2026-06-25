import type { Disposable } from "./disposable.js";
import type { Event, EventListener, RemoveEventListener } from "./event.js";

export interface EventListenerInfo<TEvent> {
    listener: EventListener<TEvent, unknown, unknown[]>;

    thisArg: unknown;

    args: unknown[];
}

export class EventEmitter<TEvent> implements Disposable {
    protected readonly listeners: EventListenerInfo<TEvent>[] = [];

    constructor() {
        this.event = this.event.bind(this);
    }

    protected addEventListener(
        info: EventListenerInfo<TEvent>,
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

    event: Event<TEvent> = <TThis, TArgs extends unknown[]>(
        listener: EventListener<TEvent, TThis, TArgs>,
        thisArg?: TThis,
        ...args: TArgs
    ) => {
        const info: EventListenerInfo<TEvent> = {
            listener: listener as EventListener<TEvent, unknown, unknown[]>,
            thisArg,
            args,
        };
        return this.addEventListener(info);
    };

    fire(e: TEvent) {
        for (const info of this.listeners.slice()) {
            info.listener.call(info.thisArg, e, ...info.args);
        }
    }

    dispose() {
        this.listeners.length = 0;
    }
}
