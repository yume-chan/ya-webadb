import { Disposable } from './disposable';

export interface EventListener<TEvent, TThis, TArgs extends unknown[], TResult> {
    (this: TThis, e: TEvent, ...args: TArgs): TResult;
}

export interface RemoveEventListener extends Disposable {
    (): void;
}

export interface Event<TEvent> {
    (listener: EventListener<TEvent, unknown, [], unknown>): RemoveEventListener;

    <TThis, TArgs extends unknown[]>(
        listener: EventListener<TEvent, TThis, TArgs, unknown>,
        thisArg: TThis,
        ...args: TArgs
    ): RemoveEventListener;
}
