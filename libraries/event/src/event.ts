import type { Disposable } from "./disposable.js";

export interface EventListener<
    TEvent,
    TThis,
    TArgs extends unknown[],
    TResult
> {
    (this: TThis, e: TEvent, ...args: TArgs): TResult;
}

export interface RemoveEventListener extends Disposable {
    (): void;
}

export interface Event<TEvent, TResult = unknown> {
    /**
     * Attaches an event listener.
     */
    (
        listener: EventListener<TEvent, unknown, [], TResult>
    ): RemoveEventListener;

    /**
     * Attaches an event listener that bind to `this` and `args`.
     */
    <TThis, TArgs extends unknown[]>(
        listener: EventListener<TEvent, TThis, TArgs, TResult>,
        thisArg: TThis,
        ...args: TArgs
    ): RemoveEventListener;
}
