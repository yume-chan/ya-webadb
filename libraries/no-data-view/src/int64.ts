export function getInt64LittleEndian(
    buffer: Uint8Array,
    offset: number,
): bigint {
    return (
        BigInt(buffer[offset]!) |
        (BigInt(buffer[offset + 1]!) << 8n) |
        (BigInt(buffer[offset + 2]!) << 16n) |
        (BigInt(buffer[offset + 3]!) << 24n) |
        (BigInt(buffer[offset + 4]!) << 32n) |
        (BigInt(buffer[offset + 5]!) << 40n) |
        (BigInt(buffer[offset + 6]!) << 48n) |
        (BigInt(buffer[offset + 7]! << 24) << 32n)
    );
}

export function getInt64BigEndian(buffer: Uint8Array, offset: number): bigint {
    return (
        (BigInt(buffer[offset]! << 24) << 32n) |
        (BigInt(buffer[offset + 1]!) << 48n) |
        (BigInt(buffer[offset + 2]!) << 40n) |
        (BigInt(buffer[offset + 3]!) << 32n) |
        (BigInt(buffer[offset + 4]!) << 24n) |
        (BigInt(buffer[offset + 5]!) << 16n) |
        (BigInt(buffer[offset + 6]!) << 8n) |
        BigInt(buffer[offset + 7]!)
    );
}

export function getInt64(
    buffer: Uint8Array,
    offset: number,
    littleEndian: boolean,
): bigint {
    return littleEndian
        ? BigInt(buffer[offset]!) |
              (BigInt(buffer[offset + 1]!) << 8n) |
              (BigInt(buffer[offset + 2]!) << 16n) |
              (BigInt(buffer[offset + 3]!) << 24n) |
              (BigInt(buffer[offset + 4]!) << 32n) |
              (BigInt(buffer[offset + 5]!) << 40n) |
              (BigInt(buffer[offset + 6]!) << 48n) |
              (BigInt(buffer[offset + 7]! << 24) << 32n)
        : (BigInt(buffer[offset]! << 24) << 32n) |
              (BigInt(buffer[offset + 1]!) << 48n) |
              (BigInt(buffer[offset + 2]!) << 40n) |
              (BigInt(buffer[offset + 3]!) << 32n) |
              (BigInt(buffer[offset + 4]!) << 24n) |
              (BigInt(buffer[offset + 5]!) << 16n) |
              (BigInt(buffer[offset + 6]!) << 8n) |
              BigInt(buffer[offset + 7]!);
}

export function setInt64LittleEndian(
    buffer: Uint8Array,
    offset: number,
    value: bigint,
): void {
    buffer[offset] = Number(value & 0xffn);
    buffer[offset + 1] = Number((value >> 8n) & 0xffn);
    buffer[offset + 2] = Number(value >> 16n);
    buffer[offset + 3] = Number(value >> 24n);
    buffer[offset + 4] = Number(value >> 32n);
    buffer[offset + 5] = Number(value >> 40n);
    buffer[offset + 6] = Number(value >> 48n);
    buffer[offset + 7] = Number(value >> 56n);
}

export function setInt64BigEndian(
    buffer: Uint8Array,
    offset: number,
    value: bigint,
): void {
    buffer[offset] = Number(value >> 56n);
    buffer[offset + 1] = Number(value >> 48n);
    buffer[offset + 2] = Number(value >> 40n);
    buffer[offset + 3] = Number(value >> 32n);
    buffer[offset + 4] = Number(value >> 24n);
    buffer[offset + 5] = Number(value >> 16n);
    buffer[offset + 6] = Number((value >> 8n) & 0xffn);
    buffer[offset + 7] = Number(value & 0xffn);
}

export function setInt64(
    buffer: Uint8Array,
    offset: number,
    value: bigint,
    littleEndian: boolean,
): void {
    if (littleEndian) {
        buffer[offset] = Number(value & 0xffn);
        buffer[offset + 1] = Number((value >> 8n) & 0xffn);
        buffer[offset + 2] = Number(value >> 16n);
        buffer[offset + 3] = Number(value >> 24n);
        buffer[offset + 4] = Number(value >> 32n);
        buffer[offset + 5] = Number(value >> 40n);
        buffer[offset + 6] = Number(value >> 48n);
        buffer[offset + 7] = Number(value >> 56n);
    } else {
        buffer[offset] = Number(value >> 56n);
        buffer[offset + 1] = Number(value >> 48n);
        buffer[offset + 2] = Number(value >> 40n);
        buffer[offset + 3] = Number(value >> 32n);
        buffer[offset + 4] = Number(value >> 24n);
        buffer[offset + 5] = Number(value >> 16n);
        buffer[offset + 6] = Number((value >> 8n) & 0xffn);
        buffer[offset + 7] = Number(value & 0xffn);
    }
}
