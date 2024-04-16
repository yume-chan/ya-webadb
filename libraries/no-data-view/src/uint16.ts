export function getUint16LittleEndian(
    buffer: Uint8Array,
    offset: number,
): number {
    return buffer[offset]! | (buffer[offset + 1]! << 8);
}

export function getUint16BigEndian(buffer: Uint8Array, offset: number): number {
    return (buffer[offset]! << 8) | buffer[offset + 1]!;
}

export function getUint16(
    buffer: Uint8Array,
    offset: number,
    littleEndian: boolean,
) {
    return littleEndian
        ? buffer[offset]! | (buffer[offset + 1]! << 8)
        : buffer[offset + 1]! | (buffer[offset]! << 8);
}
