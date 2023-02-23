import { PromiseResolver } from "@yume-chan/async";

import type { Event } from "./event.js";

export async function once<T>(event: Event<T, unknown>): Promise<T> {
    const resolver = new PromiseResolver<T>();
    const dispose = event(resolver.resolve);
    const result = await resolver.promise;
    dispose();
    return result;
}
