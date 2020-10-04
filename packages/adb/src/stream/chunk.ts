export function* chunkArrayLike(
    value: ArrayLike<number> | ArrayBufferLike,
    size: number
): Generator<ArrayBuffer, void, void> {
    if ('length' in value) {
        value = new Uint8Array(value).buffer;
    }

    if (value.byteLength <= size) {
        return yield value;
    }

    for (let i = 0; i < value.byteLength; i += size) {
        yield value.slice(i, i + size);
    }
}
