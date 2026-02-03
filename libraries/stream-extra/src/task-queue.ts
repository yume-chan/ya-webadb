import {
    isPromiseLike,
    type MaybePromise,
    type MaybePromiseLike,
} from "@yume-chan/async";

export class TaskQueue {
    #ready: PromiseLike<unknown> | undefined;
    #disposed = false;

    enqueue<T extends MaybePromiseLike<unknown>>(
        task: () => T,
        bail?: boolean,
    ): T;
    enqueue<T>(task: () => T, bail?: boolean): MaybePromise<T>;
    enqueue<T>(
        task: () => MaybePromiseLike<T>,
        bail = false,
    ): MaybePromiseLike<T> {
        if (this.#disposed) {
            throw new Error("TaskQueue is disposed");
        }

        if (!this.#ready) {
            // Init state or all previous tasks are synchronous
            try {
                const result = task();
                if (isPromiseLike(result)) {
                    this.#ready = result.then(
                        () => {},
                        (e) => {
                            if (bail) {
                                throw e;
                            }
                        },
                    );
                }
                return result;
            } catch (e) {
                if (bail) {
                    this.#ready = Promise.reject(e);
                }
                throw e;
            }
        }

        const result = this.#ready.then(() => {
            if (this.#disposed) {
                throw new Error("TaskQueue is disposed");
            }

            return task();
        });
        this.#ready = result.then(
            () => {},
            (e) => {
                if (bail || this.#disposed) {
                    throw e;
                }
            },
        );
        return result;
    }

    dispose() {
        this.#disposed = true;
    }
}
