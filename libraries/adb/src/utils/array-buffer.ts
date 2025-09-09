export function toLocalUint8Array(value: Uint8Array): Uint8Array<ArrayBuffer> {
    if (value.buffer instanceof ArrayBuffer) {
        return value as Uint8Array<ArrayBuffer>;
    }

    const copy = new Uint8Array(value.length);
    copy.set(value);
    return copy;
}
