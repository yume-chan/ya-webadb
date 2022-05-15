// PERF: Once a promise becomes async, it can't go back to sync again,
// so bypass all checks in `SyncPromise`
class AsyncPromise<T> extends Promise<T> {
    public valueOrPromise(): T | PromiseLike<T> {
        return this;
    }
}

enum State {
    Pending,
    Fulfilled,
    Rejected,
}

function fulfilledThen<T, TResult1 = T>(
    this: SyncPromise<T>,
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
): SyncPromise<TResult1> {
    if (onfulfilled) {
        return SyncPromise.try(() => onfulfilled(this.result as T));
    }
    return this as unknown as SyncPromise<TResult1>;
}

function fulfilledValue<T>(
    this: SyncPromise<T>,
) {
    return this.result as T;
}

function rejectedThen<T, TResult1 = T, TResult2 = never>(
    this: SyncPromise<T>,
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
) {
    if (onrejected) {
        return SyncPromise.try(() => onrejected(this.result));
    }
    return this as unknown as SyncPromise<TResult1 | TResult2>;
}

function rejectedValue<T>(
    this: SyncPromise<T>,
): never {
    throw this.result;
}

interface SyncPromiseThen<T> {
    <TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined
    ): SyncPromise<TResult1 | TResult2>;
}

export class SyncPromise<T> extends AsyncPromise<T> {
    // Because `super.then` will only be called when `this` is asynchronously fulfilled,
    // let it create `AsyncPromise` instead, so asynchronous path won't check for sync state anymore.
    public static [Symbol.species] = AsyncPromise;

    public static override reject<T = never>(reason?: any): SyncPromise<T> {
        return new SyncPromise<T>(
            (resolve, reject) => {
                reject(reason);
            }
        );
    }

    public static override resolve(): SyncPromise<void>;
    public static override resolve<T>(value: T | PromiseLike<T>): SyncPromise<T>;
    public static override resolve<T>(value?: T | PromiseLike<T>): SyncPromise<T> {
        // `Promise.resolve` asynchronously calls `resolve`
        // So we need to write our own.
        if (value instanceof SyncPromise) {
            return value;
        }

        return new SyncPromise<T>(
            (resolve) => {
                resolve(value!);
            }
        );
    }

    public static try<T>(executor: () => T | PromiseLike<T>): SyncPromise<T> {
        try {
            return SyncPromise.resolve(executor());
        } catch (e) {
            return SyncPromise.reject(e);
        }
    }

    public state: State;
    public result: unknown;

    public constructor(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void) {
        let state: State = State.Pending;
        let result: unknown = undefined;
        let handleThen: SyncPromise<T>['then'] = Promise.prototype.then as any;
        let handleValueOrPromise: () => T | PromiseLike<T> = () => this;

        const handleResolveCore = (value: T) => {
            state = State.Fulfilled;
            result = value;
            handleThen = fulfilledThen;
            handleValueOrPromise = fulfilledValue;
        };

        const handleRejectCore = (reason?: any) => {
            state = State.Rejected;
            result = reason;
            handleThen = rejectedThen;
            handleValueOrPromise = rejectedValue;
        };

        let settled = false;
        let sync = true;

        super((resolve, reject) => {
            const handleReject = (reason?: any) => {
                if (settled) { return; }
                settled = true;

                if (!sync) {
                    reject(reason);
                    return;
                }

                handleRejectCore(reason);
            };

            try {
                executor((value: T | PromiseLike<T>) => {
                    if (settled) { return; }
                    settled = true;

                    if (!sync) {
                        resolve(value);
                        return;
                    }

                    if (typeof value === 'object' && value !== null && typeof (value as any).then === 'function') {
                        if (value instanceof SyncPromise) {
                            switch (value.state) {
                                case State.Fulfilled:
                                    handleResolveCore(value.result as T);
                                    return;
                                case State.Rejected:
                                    handleRejectCore(value.result);
                                    return;
                            }
                        }

                        resolve(value);
                    } else {
                        handleResolveCore(value as T);
                    }
                }, handleReject);
            } catch (e) {
                handleReject(e);
            }
        });

        this.state = state;
        this.result = result;
        this.then = handleThen;
        this.valueOrPromise = handleValueOrPromise;

        sync = false;
    }

    public override then = Promise.prototype.then as SyncPromiseThen<T>;

    public override catch<TResult = never>(
        onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined
    ): SyncPromise<T | TResult> {
        return this.then(undefined, onrejected);
    }
}
