export interface SyncPromise<T> {
    then<TResult1 = T, TResult2 = never>(
        onfulfilled?:
            | ((value: T) => TResult1 | PromiseLike<TResult1>)
            | null
            | undefined,
        onrejected?:
            | ((reason: any) => TResult2 | PromiseLike<TResult2>)
            | null
            | undefined
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
    private promise: PromiseLike<T>;

    public constructor(promise: PromiseLike<T>) {
        this.promise = promise;
    }

    public then<TResult1 = T, TResult2 = never>(
        onfulfilled?:
            | ((value: T) => TResult1 | PromiseLike<TResult1>)
            | null
            | undefined,
        onrejected?:
            | ((reason: any) => TResult2 | PromiseLike<TResult2>)
            | null
            | undefined
    ) {
        return new PendingSyncPromise<TResult1 | TResult2>(
            this.promise.then(onfulfilled, onrejected)
        );
    }

    public valueOrPromise(): T | PromiseLike<T> {
        return this.promise;
    }
}

class ResolvedSyncPromise<T> implements SyncPromise<T> {
    private value: T;

    public constructor(value: T) {
        this.value = value;
    }

    public then<TResult1 = T>(
        onfulfilled?:
            | ((value: T) => TResult1 | PromiseLike<TResult1>)
            | null
            | undefined
    ) {
        if (!onfulfilled) {
            return this as any;
        }
        return SyncPromise.try(() => onfulfilled(this.value));
    }

    public valueOrPromise(): T | PromiseLike<T> {
        return this.value;
    }
}

class RejectedSyncPromise<T> implements SyncPromise<T> {
    private reason: any;

    public constructor(reason: any) {
        this.reason = reason;
    }

    public then<TResult1 = T, TResult2 = never>(
        onfulfilled?:
            | ((value: T) => TResult1 | PromiseLike<TResult1>)
            | null
            | undefined,
        onrejected?:
            | ((reason: any) => TResult2 | PromiseLike<TResult2>)
            | null
            | undefined
    ) {
        if (!onrejected) {
            return this as any;
        }
        return SyncPromise.try(() => onrejected(this.reason));
    }

    public valueOrPromise(): T | PromiseLike<T> {
        throw this.reason;
    }
}
