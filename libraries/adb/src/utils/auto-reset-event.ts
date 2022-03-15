import { PromiseResolver } from '@yume-chan/async';
import type { Disposable } from '@yume-chan/event';

export class AutoResetEvent implements Disposable {
    private readonly list: PromiseResolver<void>[] = [];

    private blocking: boolean;

    public constructor(initialSet = false) {
        this.blocking = initialSet;
    }

    public wait(): Promise<void> {
        if (!this.blocking) {
            this.blocking = true;

            if (this.list.length === 0) {
                return Promise.resolve();
            }
        }

        const resolver = new PromiseResolver<void>();
        this.list.push(resolver);
        return resolver.promise;
    }

    public notify() {
        if (this.list.length !== 0) {
            this.list.pop()!.resolve();
        } else {
            this.blocking = false;
        }
    }

    public dispose() {
        for (const item of this.list) {
            item.reject(new Error('The AutoResetEvent has been disposed'));
        }
        this.list.length = 0;
    }
}
