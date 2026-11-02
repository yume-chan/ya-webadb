import type { Disposable } from "./disposable.js";

export interface EventListener<TEvent, TThis, TArgs extends unknown[]> {
    // https://typescript-eslint.io/rules/no-misused-promises/
    // ESLint `@typescript-eslint/no-misused-promises` rule does not allow
    // converting async functions to `void`-returning function types.
    // So use `unknown` as return type to allow that,
    // because we don't care whether the listener is async or not.
    (this: TThis, e: TEvent, ...args: TArgs): unknown;
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
