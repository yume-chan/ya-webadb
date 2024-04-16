export function getInt32LittleEndian(
    buffer: Uint8Array,
    offset: number,
): number {
    return (
        buffer[offset]! |
        (buffer[offset + 1]! << 8) |
        (buffer[offset + 2]! << 16) |
        (buffer[offset + 3]! << 24)
    );
}

export function getInt32BigEndian(buffer: Uint8Array, offset: number): number {
    return (
        (buffer[offset]! << 24) |
        (buffer[offset + 1]! << 16) |
        (buffer[offset + 2]! << 8) |
        buffer[offset + 3]!
    );
}

export function getInt32(
    buffer: Uint8Array,
    offset: number,
    littleEndian: boolean,
) {
    return littleEndian
        ? buffer[offset]! |
              (buffer[offset + 1]! << 8) |
              (buffer[offset + 2]! << 16) |
              (buffer[offset + 3]! << 24)
        : (buffer[offset]! << 24) |
              (buffer[offset + 1]! << 16) |
              (buffer[offset + 2]! << 8) |
              buffer[offset + 3]!;
}
