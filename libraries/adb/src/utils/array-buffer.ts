export function toLocalUint8Array(value: Uint8Array): Uint8Array<ArrayBuffer> {
    if (value.buffer instanceof ArrayBuffer) {
        return value as Uint8Array<ArrayBuffer>;
    }

    // This invokes the `constructor(Iterable<number>)` overload and copies the data
    return new Uint8Array(value);
}
