import { PromiseResolver } from "@yume-chan/async";

import type { Event } from "./event.js";

/**
 * Asynchronously waits for the next occurrence of the event and returns its value.
 * @param event The event to wait for.
 * @returns A promise that resolves with the value of the next occurrence of the event.
 */
export async function once<T>(event: Event<T>): Promise<T> {
    const resolver = new PromiseResolver<T>();
    const dispose = event((value) => void resolver.resolve(value));
    const result = await resolver.promise;
    dispose();
    return result;
}
