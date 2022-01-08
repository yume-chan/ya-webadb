import Bluebird from 'bluebird';

export type Resolvable<R> = R | PromiseLike<R>;

export class Syncbird<T> extends Bluebird<T> implements PromiseLike<T> {
    public static resolve(): Syncbird<void>;
    public static resolve<R>(value: Resolvable<R>): Syncbird<R>;
    public static resolve<R>(value?: Resolvable<R>): Syncbird<R> {
        return new Syncbird(
            resolve => resolve(value)
        );
    }

    static try<R>(fn: () => Resolvable<R>): Syncbird<R> {
        return Syncbird.resolve(fn());
    }

    public then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): Syncbird<TResult1 | TResult2> {
        if (this.isFulfilled()) {
            if (!onfulfilled) {
                return this as unknown as Syncbird<TResult1>;
            } else {
                return Syncbird.resolve(onfulfilled(this.value()));
            }
        } else {
            return Syncbird.resolve(super.then(onfulfilled, onrejected));
        }
    }

    public valueOrPromise(): T | Promise<T> {
        if (this.isFulfilled()) {
            return this.value();
        } else {
            return this as Promise<T>;
        }
    }
}
