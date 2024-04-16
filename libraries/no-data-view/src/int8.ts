export function getInt8(buffer: Uint8Array, offset: number): number {
    return (buffer[offset]! << 24) >> 24;
}

export function setInt8(
    buffer: Uint8Array,
    offset: number,
    value: number,
): void {
    buffer[offset] = value >>> 0;
}
