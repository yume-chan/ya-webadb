export async function arrayFromAsync(
    items: AsyncIterable<unknown> | Iterable<unknown>,
    mapFn?: (element: unknown, index: number) => unknown,
    thisArg?: unknown,
) {
    const result = [];
    let index = 0;
    for await (const item of items) {
        result.push(mapFn ? await mapFn.call(thisArg, item, index) : item);
        index += 1;
    }
    return result;
}

Array.fromAsync ??= arrayFromAsync;
