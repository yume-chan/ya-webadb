import type { Event } from "./event.js";

/**
 * Creates a new event that emits the transformed value whenever the source event emits a value.
 * @param source The source event
 * @param transform A function that transforms the value of the source event to the value of the new event
 * @returns A new event that emits the transformed value whenever the source event emits a value
 */
export function pipe<TSource, TNew>(
    source: Event<TSource>,
    transform: (value: TSource) => TNew,
): Event<TNew> {
    return ((
        listener: (value: TNew, ...args: unknown[]) => undefined,
        thisArg?: unknown,
        ...args: unknown[]
    ) => {
        return source((value) => {
            return listener.call(thisArg, transform(value), ...args);
        });
    }) as never;
}
