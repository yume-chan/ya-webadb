import { PromiseResolver } from "@yume-chan/async";
import type { Disposable } from "@yume-chan/event";

interface WaitEntry {
    condition: () => boolean;
    resolver: PromiseResolver<void>;
}

export class ConditionalVariable implements Disposable {
    private _locked = false;
    private readonly _queue: WaitEntry[] = [];

    public wait(condition: () => boolean): Promise<void> {
        if (!this._locked) {
            this._locked = true;
            if (this._queue.length === 0 && condition()) {
                return Promise.resolve();
            }
        }

        const resolver = new PromiseResolver<void>();
        this._queue.push({ condition, resolver });
        return resolver.promise;
    }

    public notifyOne() {
        const entry = this._queue.shift();
        if (entry) {
            if (entry.condition()) {
                entry.resolver.resolve();
            }
        } else {
            this._locked = false;
        }
    }

    public dispose(): void {
        for (const item of this._queue) {
            item.resolver.reject(
                new Error("The ConditionalVariable has been disposed")
            );
        }
        this._queue.length = 0;
    }
}
