export interface SyncPromise<T> {
    then<TResult1 = T, TResult2 = never>(
        onfulfilled?:
            | ((value: T) => TResult1 | PromiseLike<TResult1>)
            | null
            | undefined,
        onrejected?:
            | ((reason: any) => TResult2 | PromiseLike<TResult2>)
            | null
            | undefined,
    ): SyncPromise<TResult1 | TResult2>;

    valueOrPromise(): T | PromiseLike<T>;
}

interface SyncPromiseStatic {
    reject<T = never>(reason?: any): SyncPromise<T>;

    resolve(): SyncPromise<void>;
    resolve<T>(value: T | PromiseLike<T>): SyncPromise<T>;

    try<T>(executor: () => T | PromiseLike<T>): SyncPromise<T>;
}

export const SyncPromise: SyncPromiseStatic = {
    reject<T = never>(reason?: any): SyncPromise<T> {
        return new RejectedSyncPromise(reason);
    },
    resolve<T>(value?: T | PromiseLike<T>): SyncPromise<T> {
        if (
            typeof value === "object" &&
            value !== null &&
            typeof (value as PromiseLike<T>).then === "function"
        ) {
            if (
                value instanceof PendingSyncPromise ||
                value instanceof ResolvedSyncPromise ||
                value instanceof RejectedSyncPromise
            ) {
                return value;
            }

            return new PendingSyncPromise(value as PromiseLike<T>);
        } else {
            return new ResolvedSyncPromise(value as T);
        }
    },
    try<T>(executor: () => T | PromiseLike<T>): SyncPromise<T> {
        try {
            return SyncPromise.resolve(executor());
        } catch (e) {
            return SyncPromise.reject(e);
        }
    },
};

class PendingSyncPromise<T> implements SyncPromise<T> {
    #promise: PromiseLike<T>;

    constructor(promise: PromiseLike<T>) {
        this.#promise = promise;
    }

    then<TResult1 = T, TResult2 = never>(
        onfulfilled?:
            | ((value: T) => TResult1 | PromiseLike<TResult1>)
            | null
            | undefined,
        onrejected?:
            | ((reason: any) => TResult2 | PromiseLike<TResult2>)
            | null
            | undefined,
    ) {
        return new PendingSyncPromise<TResult1 | TResult2>(
            this.#promise.then(onfulfilled, onrejected),
        );
    }

    valueOrPromise(): T | PromiseLike<T> {
        return this.#promise;
    }
}

class ResolvedSyncPromise<T> implements SyncPromise<T> {
    #value: T;

    constructor(value: T) {
        this.#value = value;
    }

    then<TResult1 = T>(
        onfulfilled?:
            | ((value: T) => TResult1 | PromiseLike<TResult1>)
            | null
            | undefined,
    ) {
        if (!onfulfilled) {
            return this as any;
        }
        return SyncPromise.try(() => onfulfilled(this.#value));
    }

    valueOrPromise(): T | PromiseLike<T> {
        return this.#value;
    }
}

class RejectedSyncPromise<T> implements SyncPromise<T> {
    #reason: any;

    constructor(reason: any) {
        this.#reason = reason;
    }

    then<TResult1 = T, TResult2 = never>(
        onfulfilled?:
            | ((value: T) => TResult1 | PromiseLike<TResult1>)
            | null
            | undefined,
        onrejected?:
            | ((reason: any) => TResult2 | PromiseLike<TResult2>)
            | null
            | undefined,
    ) {
        if (!onrejected) {
            return this as any;
        }
        return SyncPromise.try(() => onrejected(this.#reason));
    }

    valueOrPromise(): T | PromiseLike<T> {
        throw this.#reason;
    }
}
