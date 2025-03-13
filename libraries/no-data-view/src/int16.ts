/* #__NO_SIDE_EFFECTS__ */
export function getInt16LittleEndian(
    buffer: Uint8Array,
    offset: number,
): number {
    return ((buffer[offset]! | (buffer[offset + 1]! << 8)) << 16) >> 16;
}

/* #__NO_SIDE_EFFECTS__ */
export function getInt16BigEndian(buffer: Uint8Array, offset: number): number {
    return (((buffer[offset]! << 8) | buffer[offset + 1]!) << 16) >> 16;
}

/* #__NO_SIDE_EFFECTS__ */
export function getInt16(
    buffer: Uint8Array,
    offset: number,
    littleEndian: boolean,
) {
    return littleEndian
        ? ((buffer[offset]! | (buffer[offset + 1]! << 8)) << 16) >> 16
        : (((buffer[offset]! << 8) | buffer[offset + 1]!) << 16) >> 16;
}

/* #__NO_SIDE_EFFECTS__ */
export function setInt16LittleEndian(
    buffer: Uint8Array,
    offset: number,
    value: number,
): void {
    buffer[offset] = value;
    buffer[offset + 1] = value >> 8;
}

export function setInt16BigEndian(
    buffer: Uint8Array,
    offset: number,
    value: number,
): void {
    buffer[offset] = value >> 8;
    buffer[offset + 1] = value;
}

export function setInt16(
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
