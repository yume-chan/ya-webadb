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

function rejectedThen<T, TResult1 = T, TResult2 = never>(
    this: SyncPromise<T>,
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
): SyncPromise<TResult2> {
    if (onrejected) {
        return SyncPromise.try(() => onrejected(this.result));
    }
    return this as unknown as SyncPromise<TResult2>;
}

function fulfilledValue<T>(
    this: SyncPromise<T>,
) {
    return this.result as T;
}

function rejectedValue<T>(
    this: SyncPromise<T>,
): never {
    throw this.result;
}

const INTERNAL_CREATED = Symbol('internal-created') as any;

export class SyncPromise<T> implements PromiseLike<T> {
    public static reject<T = never>(reason?: any): SyncPromise<T> {
        const promise = new SyncPromise<T>(INTERNAL_CREATED);
        promise.handleReject(reason);
        return promise;
    }

    public static resolve(): SyncPromise<void>;
    public static resolve<T>(value: T | PromiseLike<T>): SyncPromise<T>;
    public static resolve<T>(value?: T | PromiseLike<T>): SyncPromise<T> {
        if (value instanceof SyncPromise) {
            return value;
        }

        const promise = new SyncPromise<T>(INTERNAL_CREATED);
        promise.handleResolve(value!);
        return promise;
    }

    public static try<T>(executor: () => T | PromiseLike<T>): SyncPromise<T> {
        try {
            return SyncPromise.resolve(executor());
        } catch (e) {
            return SyncPromise.reject(e);
        }
    }

    public state: State = State.Pending;
    public result: unknown;
    public promise: PromiseLike<T> | undefined;

    public constructor(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void) {
        if (executor === INTERNAL_CREATED) {
            return;
        }

        let promiseResolve: (value: T | PromiseLike<T>) => void;
        let promiseReject: (reason?: any) => void;

        let settled = false;
        let sync = true;

        const handleReject = (reason?: any) => {
            if (settled) { return; }
            settled = true;

            if (!sync) {
                promiseReject(reason);
                return;
            }

            this.handleReject(reason);
        };

        try {
            executor(
                (value: T | PromiseLike<T>) => {
                    if (settled) { return; }
                    settled = true;

                    if (!sync) {
                        promiseResolve(value);
                        return;
                    }

                    this.handleResolve(value);
                },
                handleReject
            );
        } catch (e) {
            handleReject(e);
        }

        if (this.state === State.Pending && !this.promise) {
            this.promise = new Promise<T>((resolve, reject) => {
                promiseResolve = resolve;
                promiseReject = reject;
            });
        }

        sync = false;
    }

    private handleResolveValue(value: T) {
        this.state = State.Fulfilled;
        this.result = value;
        this.then = fulfilledThen;
        this.valueOrPromise = fulfilledValue;
    };

    private handleResolve(value: T | PromiseLike<T>) {
        if (typeof value === 'object' &&
            value !== null &&
            'then' in value &&
            typeof value.then === 'function'
        ) {
            if (value instanceof SyncPromise) {
                switch (value.state) {
                    case State.Fulfilled:
                        this.handleResolveValue(value.result as T);
                        return;
                    case State.Rejected:
                        this.handleReject(value.result);
                        return;
                }
            }

            this.promise = value as PromiseLike<T>;
        } else {
            this.handleResolveValue(value as T);
        }
    }

    private handleReject(reason?: any) {
        this.state = State.Rejected;
        this.result = reason;
        this.then = rejectedThen;
        this.valueOrPromise = rejectedValue;
    };

    public then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined
    ): SyncPromise<TResult1 | TResult2> {
        // The result promise isn't really a `SyncPromise`,
        // but we attach a `valueOrPromise` to it,
        // so it's compatible with `SyncPromise`.
        // PERF: it's 230% faster than creating a real `SyncPromise` instance.
        const promise =
            this.promise!.then(onfulfilled, onrejected) as unknown as SyncPromise<TResult1 | TResult2>;
        promise.valueOrPromise = this.valueOrPromise as unknown as () => TResult1 | TResult2 | PromiseLike<TResult1 | TResult2>;
        return promise;
    }

    public catch<TResult = never>(
        onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined
    ): SyncPromise<T | TResult> {
        return this.then(undefined, onrejected);
    }

    public valueOrPromise(): T | PromiseLike<T> {
        return this;
    }
}
