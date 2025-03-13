/* #__NO_SIDE_EFFECTS__ */
export function getUint32LittleEndian(
    buffer: Uint8Array,
    offset: number,
): number {
    return (
        (buffer[offset]! |
            (buffer[offset + 1]! << 8) |
            (buffer[offset + 2]! << 16) |
            (buffer[offset + 3]! << 24)) >>>
        0
    );
}

/* #__NO_SIDE_EFFECTS__ */
export function getUint32BigEndian(buffer: Uint8Array, offset: number): number {
    return (
        ((buffer[offset]! << 24) |
            (buffer[offset + 1]! << 16) |
            (buffer[offset + 2]! << 8) |
            buffer[offset + 3]!) >>>
        0
    );
}

/* #__NO_SIDE_EFFECTS__ */
export function getUint32(
    buffer: Uint8Array,
    offset: number,
    littleEndian: boolean,
) {
    return littleEndian
        ? (buffer[offset]! |
              (buffer[offset + 1]! << 8) |
              (buffer[offset + 2]! << 16) |
              (buffer[offset + 3]! << 24)) >>>
              0
        : ((buffer[offset]! << 24) |
              (buffer[offset + 1]! << 16) |
              (buffer[offset + 2]! << 8) |
              buffer[offset + 3]!) >>>
              0;
}

export function setUint32LittleEndian(
    buffer: Uint8Array,
    offset: number,
    value: number,
): void {
    buffer[offset] = value;
    buffer[offset + 1] = value >> 8;
    buffer[offset + 2] = value >> 16;
    buffer[offset + 3] = value >> 24;
}

export function setUint32BigEndian(
    buffer: Uint8Array,
    offset: number,
    value: number,
): void {
    buffer[offset] = value >> 24;
    buffer[offset + 1] = value >> 16;
    buffer[offset + 2] = value >> 8;
    buffer[offset + 3] = value;
}

export function setUint32(
    buffer: Uint8Array,
    offset: number,
    value: number,
    littleEndian: boolean,
): void {
    if (littleEndian) {
        buffer[offset] = value;
        buffer[offset + 1] = value >> 8;
        buffer[offset + 2] = value >> 16;
        buffer[offset + 3] = value >> 24;
    } else {
        buffer[offset] = value >> 24;
        buffer[offset + 1] = value >> 16;
        buffer[offset + 2] = value >> 8;
        buffer[offset + 3] = value;
    }
}
