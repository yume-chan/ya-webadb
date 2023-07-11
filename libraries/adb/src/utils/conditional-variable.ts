import { PromiseResolver } from "@yume-chan/async";
import type { Disposable } from "@yume-chan/event";

interface WaitEntry {
    condition: () => boolean;
    resolver: PromiseResolver<void>;
}

export class ConditionalVariable implements Disposable {
    #locked = false;
    readonly #queue: WaitEntry[] = [];

    wait(condition: () => boolean): Promise<void> {
        if (!this.#locked) {
            this.#locked = true;
            if (this.#queue.length === 0 && condition()) {
                return Promise.resolve();
            }
        }

        const resolver = new PromiseResolver<void>();
        this.#queue.push({ condition, resolver });
        return resolver.promise;
    }

    notifyOne() {
        const entry = this.#queue.shift();
        if (entry) {
            if (entry.condition()) {
                entry.resolver.resolve();
            }
        } else {
            this.#locked = false;
        }
    }

    dispose(): void {
        for (const item of this.#queue) {
            item.resolver.reject(
                new Error("The ConditionalVariable has been disposed"),
            );
        }
        this.#queue.length = 0;
    }
}
