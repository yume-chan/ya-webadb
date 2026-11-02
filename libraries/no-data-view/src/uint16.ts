/* #__NO_SIDE_EFFECTS__ */
export function getUint16LittleEndian(
    buffer: Uint8Array,
    offset: number,
): number {
    return buffer[offset]! | (buffer[offset + 1]! << 8);
}

/* #__NO_SIDE_EFFECTS__ */
export function getUint16BigEndian(buffer: Uint8Array, offset: number): number {
    return (buffer[offset]! << 8) | buffer[offset + 1]!;
}

/* #__NO_SIDE_EFFECTS__ */
export function getUint16(
    buffer: Uint8Array,
    offset: number,
    littleEndian: boolean,
) {
    return littleEndian
        ? buffer[offset]! | (buffer[offset + 1]! << 8)
        : buffer[offset + 1]! | (buffer[offset]! << 8);
}

export function setUint16LittleEndian(
    buffer: Uint8Array,
    offset: number,
    value: number,
): void {
    buffer[offset] = value;
    buffer[offset + 1] = value >> 8;
}

export function setUint16BigEndian(
    buffer: Uint8Array,
    offset: number,
    value: number,
): void {
    buffer[offset] = value >> 8;
    buffer[offset + 1] = value;
}

export function setUint16(
    buffer: Uint8Array,
    offset: number,
    value: number,
    littleEndian: boolean,
): void {
    if (littleEndian) {
        buffer[offset] = value;
        buffer[offset + 1] = value >> 8;
    } else {
        buffer[offset] = value >> 8;
        buffer[offset + 1] = value;
    }
}
