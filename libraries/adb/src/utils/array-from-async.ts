import type { MaybePromiseLike } from "@yume-chan/async";

function isConstructor<T>(value: unknown): value is T {
    try {
        Reflect.construct(String, [], value as never);
        return true;
    } catch {
        return false;
    }
}

export async function arrayFromAsync<T>(
    this: ArrayConstructor | void,
    items:
        | AsyncIterable<T>
        | Iterable<MaybePromiseLike<T>>
        | ArrayLike<MaybePromiseLike<T>>,
    mapper?: (element: T, index: number) => MaybePromiseLike<T>,
    thisArg?: unknown,
) {
    if (Symbol.asyncIterator in items || Symbol.iterator in items) {
        const result: unknown[] = new (
            isConstructor<ArrayConstructor>(this) ? this : Array
        )();
        let index = 0;
        for await (const item of items) {
            result[index] = mapper
                ? await mapper.call(thisArg, item, index)
                : item;
            index += 1;
        }
        result.length = index;
        return result;
    }

    const length = items.length;
    const result: unknown[] = new (
        isConstructor<ArrayConstructor>(this) ? this : Array
    )(length);
    for (let index = 0; index < length; index += 1) {
        const item = await items[index]!;
        result[index] = mapper ? await mapper.call(thisArg, item, index) : item;
    }
    return result;
}

Array.fromAsync ??= arrayFromAsync;
