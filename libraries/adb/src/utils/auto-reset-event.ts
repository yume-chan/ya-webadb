import { PromiseResolver } from "@yume-chan/async";
import type { Disposable } from "@yume-chan/event";

export class AutoResetEvent implements Disposable {
    #set: boolean;
    readonly #queue: PromiseResolver<void>[] = [];

    public constructor(initialSet = false) {
        this.#set = initialSet;
    }

    public wait(): Promise<void> {
        if (!this.#set) {
            this.#set = true;

            if (this.#queue.length === 0) {
                return Promise.resolve();
            }
        }

        const resolver = new PromiseResolver<void>();
        this.#queue.push(resolver);
        return resolver.promise;
    }

    public notifyOne() {
        if (this.#queue.length !== 0) {
            this.#queue.pop()!.resolve();
        } else {
            this.#set = false;
        }
    }

    public dispose() {
        for (const item of this.#queue) {
            item.reject(new Error("The AutoResetEvent has been disposed"));
        }
        this.#queue.length = 0;
    }
}
