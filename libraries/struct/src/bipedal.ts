import type { MaybePromiseLike } from "@yume-chan/async";
import { isPromiseLike } from "@yume-chan/async";

function advance<T>(
    iterator: Generator<unknown, T, unknown>,
    next: unknown,
): MaybePromiseLike<T> {
    while (true) {
        const { done, value } = iterator.next(next);
        if (done) {
            return value;
        }
        if (isPromiseLike(value)) {
            return value.then(
                (value) => advance(iterator, value),
                (error: unknown) => {
                    iterator.throw(error);
                    throw error;
                },
            );
        }
        next = value;
    }
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
        return advance(generator, undefined);
    }

    if (bindThis) {
        return result.bind(bindThis);
    } else {
        return result;
    }
}
