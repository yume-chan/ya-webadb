import type { MaybePromiseLike } from "@yume-chan/async";

// A simplified version that only works with sync/async iterables that fits our use case.
export async function arrayFromAsyncPolyfill<T>(
    items: AsyncIterable<T> | Iterable<MaybePromiseLike<T>>,
) {
    const result: T[] = [];
    let index = 0;
    for await (const item of items) {
        Object.defineProperty(result, index, {
            value: item,
            writable: true,
            enumerable: true,
            configurable: true,
        });
        index += 1;
    }
    result.length = index;
    return result;
}

export const arrayFromAsync = Array.fromAsync ?? arrayFromAsyncPolyfill;
