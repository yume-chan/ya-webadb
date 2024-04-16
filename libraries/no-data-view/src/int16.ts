export function getInt16LittleEndian(
    buffer: Uint8Array,
    offset: number,
): number {
    return ((buffer[offset]! | (buffer[offset + 1]! << 8)) << 16) >> 16;
}

export function getInt16BigEndian(buffer: Uint8Array, offset: number): number {
    return (((buffer[offset]! << 8) | buffer[offset + 1]!) << 16) >> 16;
}

export function getInt16(
    buffer: Uint8Array,
    offset: number,
    littleEndian: boolean,
) {
    return littleEndian
        ? ((buffer[offset]! | (buffer[offset + 1]! << 8)) << 16) >> 16
        : (((buffer[offset]! << 8) | buffer[offset + 1]!) << 16) >> 16;
}

export function setInt16LittleEndian(
    buffer: Uint8Array,
    offset: number,
    value: number,
): void {
    buffer[offset] = value & 0xff;
    buffer[offset + 1] = (value >> 8) & 0xff;
}

export function setInt16BigEndian(
    buffer: Uint8Array,
    offset: number,
    value: number,
): void {
    buffer[offset] = (value >> 8) & 0xff;
    buffer[offset + 1] = value & 0xff;
}

export function setInt16(
    buffer: Uint8Array,
    offset: number,
    value: number,
    littleEndian: boolean,
): void {
    if (littleEndian) {
        buffer[offset] = value & 0xff;
        buffer[offset + 1] = (value >> 8) & 0xff;
    } else {
        buffer[offset] = (value >> 8) & 0xff;
        buffer[offset + 1] = value & 0xff;
    }
}
