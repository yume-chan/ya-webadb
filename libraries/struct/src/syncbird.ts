// cspell: ignore syncbird

export class Syncbird<T> extends Promise<T> {
    private resolved: boolean;
    private rejected: boolean;
    private result: unknown;

    public static override resolve(): Syncbird<void>;
    public static override resolve<T>(value: T | PromiseLike<T>): Syncbird<T>;
    public static override resolve<T>(value?: T | PromiseLike<T>): Syncbird<T> {
        return new Syncbird((resolve, reject) => {
            resolve(value!);
        });
    }

    public static each<T>(array: T[], callback: (item: T, index: number) => Syncbird<void>): Syncbird<void> {
        return array.reduce((prev, item, index) => {
            return prev.then(() => {
                return callback(item, index);
            });
        }, Syncbird.resolve());
    }

    public static try<T>(executor: () => T | PromiseLike<T>): Syncbird<T> {
        return new Syncbird((resolve, reject) => {
            try {
                resolve(executor());
            } catch (e) {
                reject(e);
            }
        });
    }

    public constructor(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void) {
        let sync = true;
        let settled = false;
        let resolved = false;
        let rejected = false;
        let result: unknown = undefined;

        super((resolve, reject) => {
            try {
                executor((value) => {
                    if (settled) {
                        return;
                    }

                    settled = true;

                    if (!sync) {
                        resolve(value);
                        return;
                    }

                    if (typeof value === 'object' &&
                        value !== null &&
                        'then' in value &&
                        typeof value.then === 'function') {
                        resolve(value);
                        return;
                    }

                    resolved = true;
                    result = value;
                }, (reason) => {
                    if (settled) {
                        return;
                    }

                    settled = true;

                    if (!sync) {
                        reject(reason);
                        return;
                    }

                    rejected = true;
                    result = reason;
                });
            } catch (e) {
                if (settled) {
                    return;
                }

                settled = true;

                if (!sync) {
                    reject(e);
                    return;
                }

                rejected = true;
                result = e;
            }
        });

        sync = false;
        this.resolved = resolved;
        this.rejected = rejected;
        this.result = result;
    }

    public override then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined
    ): Syncbird<TResult1 | TResult2> {
        if (this.resolved) {
            if (onfulfilled) {
                return new Syncbird((resolve, reject) => {
                    try {
                        resolve(onfulfilled(this.result as T));
                    } catch (e) {
                        reject(e);
                    }
                });
            }
            return this as unknown as Syncbird<TResult1 | TResult2>;
        }

        if (this.rejected) {
            if (onrejected) {
                return new Syncbird((resolve, reject) => {
                    try {
                        resolve(onrejected(this.result as any));
                    } catch (e) {
                        reject(e);
                    }
                });
            }
            return this as unknown as Syncbird<TResult1 | TResult2>;
        }

        return Syncbird.resolve(super.then(onfulfilled, onrejected));
    }

    public override catch<TResult = never>(
        onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined
    ): Promise<T | TResult> {
        return this.then(undefined, onrejected);
    }

    public valueOrPromise(): T | PromiseLike<T> {
        if (this.resolved) {
            return this.result as T;
        }

        if (this.rejected) {
            return this.result as any;
        }

        return this as Promise<T>;
    }
}
