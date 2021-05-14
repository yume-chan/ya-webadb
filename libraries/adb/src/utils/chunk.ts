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

export async function* chunkAsyncIterable(
    value: AsyncIterable<ArrayBuffer>,
    size: number
): AsyncGenerator<ArrayBuffer, void, void> {
    let result = new Uint8Array(size);
    let index = 0;
    for await (let buffer of value) {
        // `result` has some data, `result + buffer` is enough
        if (index !== 0 && index + buffer.byteLength >= size) {
            const remainder = size - index;
            result.set(new Uint8Array(buffer, 0, remainder), index);
            yield result.buffer;

            result = new Uint8Array(size);
            index = 0;

            if (buffer.byteLength > remainder) {
                // `buffer` still has some data
                buffer = buffer.slice(remainder);
            } else {
                continue;
            }
        }

        // `result` is empty, `buffer` alone is enough
        if (buffer.byteLength >= size) {
            let remainder = false;
            for (const chunk of chunkArrayLike(buffer, size)) {
                if (chunk.byteLength === size) {
                    yield chunk;
                    continue;
                }

                // `buffer` still has some data
                remainder = true;
                buffer = chunk;
            }

            if (!remainder) {
                continue;
            }
        }

        // `result` has some data but `result + buffer` is still not enough
        // or after previous steps `buffer` still has some data
        result.set(new Uint8Array(buffer), index);
        index += buffer.byteLength;
    }

    if (index !== 0) {
        yield result.buffer.slice(0, index);
    }
}
