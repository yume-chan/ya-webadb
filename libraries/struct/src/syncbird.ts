import Bluebird from 'bluebird';

type Resolvable<R> = R | PromiseLike<R>;

export interface Syncbird<R> extends Bluebird<R> {
    valueOrPromise(): R | PromiseLike<R>;

    then<U>(onFulfill?: (value: R) => Resolvable<U>, onReject?: (error: any) => Resolvable<U>): Syncbird<U>; // For simpler signature help.
    then<TResult1 = R, TResult2 = never>(
        onfulfilled?: ((value: R) => Resolvable<TResult1>) | null,
        onrejected?: ((reason: any) => Resolvable<TResult2>) | null
    ): Syncbird<TResult1 | TResult2>;
}

interface SyncbirdStatic {
    /**
     * Create a promise that is resolved with the given `value`. If `value` is a thenable or promise, the returned promise will assume its state.
     */
    resolve(): Syncbird<void>;
    resolve<R>(value: Resolvable<R>): Syncbird<R>;

    try<R>(fn: () => Resolvable<R>): Syncbird<R>;
    attempt<R>(fn: () => Resolvable<R>): Syncbird<R>;

    new <R>(callback: (resolve: (thenableOrResult?: Resolvable<R>) => void, reject: (error?: any) => void, onCancel?: (callback: () => void) => void) => void): Syncbird<R>;
}

export const Syncbird: SyncbirdStatic = Bluebird.getNewLibraryCopy() as any;

const _then = Bluebird.prototype.then;
Syncbird.prototype.then = function <T, TResult1 = T, TResult2 = never>(
    this: Bluebird<T>,
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
): Syncbird<TResult1 | TResult2> {
    if (this.isFulfilled()) {
        if (!onfulfilled) {
            return this as unknown as Syncbird<TResult1>;
        } else {
            return Syncbird.resolve(onfulfilled(this.value())) as Syncbird<TResult1 | TResult2>;
        }
    } else {
        return _then.call(this, onfulfilled, onrejected) as Syncbird<TResult1 | TResult2>;
    }
};

(Syncbird.prototype as any).valueOrPromise = function <T>(this: Bluebird<T>): T | PromiseLike<T> {
    if (this.isFulfilled()) {
        return this.value();
    } else {
        return this as Promise<T>;
    }
};
