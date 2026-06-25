import type { Disposable } from "./disposable.js";

export interface EventListener<TEvent, TThis, TArgs extends unknown[]> {
    (this: TThis, e: TEvent, ...args: TArgs): void;
}

export interface RemoveEventListener extends Disposable {
    (): void;
}

export interface Event<TEvent> {
    /**
     * Attaches an event listener.
     */
    (listener: EventListener<TEvent, unknown, []>): RemoveEventListener;

    /**
     * Attaches an event listener that bind to `this` and `args`.
     */
    <TThis, TArgs extends unknown[]>(
        listener: EventListener<TEvent, TThis, TArgs>,
        thisArg: TThis,
        ...args: TArgs
    ): RemoveEventListener;
}
