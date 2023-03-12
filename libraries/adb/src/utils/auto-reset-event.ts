import { PromiseResolver } from "@yume-chan/async";
import type { Disposable } from "@yume-chan/event";

export class AutoResetEvent implements Disposable {
    private _set: boolean;
    private readonly _queue: PromiseResolver<void>[] = [];

    public constructor(initialSet = false) {
        this._set = initialSet;
    }

    public wait(): Promise<void> {
        if (!this._set) {
            this._set = true;

            if (this._queue.length === 0) {
                return Promise.resolve();
            }
        }

        const resolver = new PromiseResolver<void>();
        this._queue.push(resolver);
        return resolver.promise;
    }

    public notifyOne() {
        if (this._queue.length !== 0) {
            this._queue.pop()!.resolve();
        } else {
            this._set = false;
        }
    }

    public dispose() {
        for (const item of this._queue) {
            item.reject(new Error("The AutoResetEvent has been disposed"));
        }
        this._queue.length = 0;
    }
}
