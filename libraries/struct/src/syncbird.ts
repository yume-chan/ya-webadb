// cspell: ignore syncbird

import Bluebird from 'bluebird';

export type Resolvable<R> = R | PromiseLike<R>;
export type IterateFunction<T, R> = (item: T, index: number, arrayLength: number) => Resolvable<R>;

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
     * Iterate over an array, or a promise of an array,
     * which contains promises (or a mix of promises and values) with the given iterator function with the signature `(item, index, value)`
     * where item is the resolved value of a respective promise in the input array.
     * Iteration happens serially. If any promise in the input array is rejected the returned promise is rejected as well.
     *
     * Resolves to the original array unmodified, this method is meant to be used for side effects.
     * If the iterator function returns a promise or a thenable, the result for the promise is awaited for before continuing with next iteration.
     */
    each<R>(
        values: Resolvable<Iterable<Resolvable<R>>>,
        iterator: IterateFunction<R, any>
    ): Syncbird<R[]>;

    /**
     * Reduce an array, or a promise of an array,
     * which contains a promises (or a mix of promises and values) with the given `reducer` function with the signature `(total, current, index, arrayLength)`
     * where `item` is the resolved value of a respective promise in the input array.
     * If any promise in the input array is rejected the returned promise is rejected as well.
     *
     * If the reducer function returns a promise or a thenable, the result for the promise is awaited for before continuing with next iteration.
     *
     * *The original array is not modified. If no `initialValue` is given and the array doesn't contain at least 2 items,
     * the callback will not be called and `undefined` is returned.
     *
     * If `initialValue` is given and the array doesn't have at least 1 item, `initialValue` is returned.*
     */
    reduce<R, U>(
        values: Resolvable<Iterable<Resolvable<R>>>,
        reducer: (total: U, current: R, index: number, arrayLength: number) => Resolvable<U>,
        initialValue?: U
    ): Syncbird<U>;

    /**
     * Create a promise that is resolved with the given `value`. If `value` is a thenable or promise, the returned promise will assume its state.
     */
    resolve(): Syncbird<void>;
    resolve<R>(value: Resolvable<R>): Syncbird<R>;

    try<R>(fn: () => Resolvable<R>): Syncbird<R>;
    attempt<R>(fn: () => Resolvable<R>): Syncbird<R>;

    /**
     * Configure long stack traces, warnings, monitoring and cancellation.
     * Note that even though false is the default here, a development environment might be detected which automatically
     *  enables long stack traces and warnings.
     */
    config(options: {
        /** Enable warnings */
        warnings?: boolean | {
            /** Enables all warnings except forgotten return statements. */
            wForgottenReturn: boolean;
        } | undefined;
        /** Enable long stack traces */
        longStackTraces?: boolean | undefined;
        /** Enable cancellation */
        cancellation?: boolean | undefined;
        /** Enable monitoring */
        monitoring?: boolean | undefined;
        /** Enable async hooks */
        asyncHooks?: boolean | undefined;
    }): void;

    new <R>(callback: (resolve: (thenableOrResult?: Resolvable<R>) => void, reject: (error?: any) => void, onCancel?: (callback: () => void) => void) => void): Syncbird<R>;
}

export const Syncbird: SyncbirdStatic = Bluebird.getNewLibraryCopy() as any;

Syncbird.config({
    asyncHooks: false,
    cancellation: false,
    longStackTraces: false,
    monitoring: false,
    warnings: false,
});

// Bluebird uses `_then` internally.
const _then = (Syncbird.prototype as any)._then;
Syncbird.prototype._then = function <T, TResult1 = T, TResult2 = never>(
    this: Syncbird<T>,
    onfulfilled: ((value: T, internalData?: unknown) => unknown) | undefined | null,
    onrejected: ((reason: any) => unknown) | undefined | null,
    _: never,
    receiver: unknown,
    internalData: unknown,
): Syncbird<unknown> {
    if (this.isFulfilled()) {
        if (!onfulfilled) {
            return this;
        } else {
            // Synchronously call `onfulfilled`, and wrap the result in a new `Syncbird` object.
            return Syncbird.resolve(
                onfulfilled.call(
                    receiver,
                    this.value(),
                    // Some Bluebird internal methods (for example `reduce`) need this `internalData`
                    internalData
                )
            );
        }
    } else {
        // Forward to Bluebird's `_then` method.
        return _then.call(this, onfulfilled, onrejected, _, receiver, internalData);
    }
};

(Syncbird.prototype as any).valueOrPromise = function <T>(this: Bluebird<T>): T | PromiseLike<T> {
    if (this.isFulfilled()) {
        return this.value();
    } else {
        return this as Promise<T>;
    }
};
