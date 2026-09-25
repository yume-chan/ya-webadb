import type { MaybePromiseLike } from "@yume-chan/async";
import { isPromiseLike } from "@yume-chan/async";

function advance<T>(
    iterator: Generator<unknown, T, unknown>,
    { done, value }: IteratorResult<unknown, T>,
): MaybePromiseLike<T> {
    if (done) {
        return value;
    }
    if (isPromiseLike(value)) {
        return value.then(
            (value) => advance(iterator, iterator.next(value)),
            (error: unknown) => advance(iterator, iterator.throw(error)),
        );
    }
    return advance(iterator, iterator.next(value));
}

function start<T>(generator: Generator<unknown, T, unknown>) {
    return advance(generator, generator.next(undefined));
}

export type BipedalThen = <T>(
    value: MaybePromiseLike<T>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Iterable<PromiseLike<any>, T, unknown>;

export type BipedalGenerator<This, T, A extends unknown[]> = (
    this: This,
    then: BipedalThen,
    ...args: A
) => Generator<unknown, MaybePromiseLike<T>, unknown>;

/* #__NO_SIDE_EFFECTS__ */
export function bipedal<This, T, A extends unknown[]>(
    fn: BipedalGenerator<This, T, A>,
): { (this: This, ...args: A): MaybePromiseLike<T> };
export function bipedal<This, T, A extends unknown[]>(
    fn: BipedalGenerator<This, T, A>,
    bindThis: This,
): { (...args: A): MaybePromiseLike<T> };
export function bipedal<This, T, A extends unknown[]>(
    fn: BipedalGenerator<This, T, A>,
    bindThis?: This,
): { (...args: A): MaybePromiseLike<T> } {
    function result(this: This, ...args: A): MaybePromiseLike<T> {
        const generator = fn.call(
            this,
            function* <U>(
                value: MaybePromiseLike<U>,
            ): Generator<PromiseLike<U>, U, U> {
                if (isPromiseLike(value)) {
                    return yield value;
                }

                return value;
            },
            ...args,
        ) as never;
        return start(generator);
    }

    if (bindThis) {
        return result.bind(bindThis);
    } else {
        return result;
    }
}
