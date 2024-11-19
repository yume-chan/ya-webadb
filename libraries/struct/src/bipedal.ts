import type { MaybePromiseLike } from "@yume-chan/async";
import { isPromiseLike } from "@yume-chan/async";

function advance<T>(
    iterator: Iterator<unknown, T, unknown>,
    next: unknown,
): MaybePromiseLike<T> {
    while (true) {
        const { done, value } = iterator.next(next);
        if (done) {
            return value;
        }
        if (isPromiseLike(value)) {
            return value.then(
                (value) => advance(iterator, { resolved: value }),
                (error: unknown) => advance(iterator, { error }),
            );
        }
        next = value;
    }
}

export function bipedal<This, T, A extends unknown[]>(
    fn: (
        this: This,
        then: <U>(value: U | PromiseLike<U>) => Iterable<unknown, U, unknown>,
        ...args: A
    ) => Generator<unknown, T, unknown>,
): { (this: This, ...args: A): MaybePromiseLike<T> } {
    return function (this: This, ...args: A) {
        const iterator = fn.call(
            this,
            function* <U>(
                value: U | PromiseLike<U>,
            ): Generator<
                PromiseLike<U>,
                U,
                { resolved: U } | { error: unknown }
            > {
                if (isPromiseLike(value)) {
                    const result = yield value;
                    if ("resolved" in result) {
                        return result.resolved;
                    } else {
                        throw result.error;
                    }
                }

                return value;
            },
            ...args,
        ) as never;
        return advance(iterator, undefined);
    };
}
