function hexCharToNumber(char: number) {
    if (char < 48) {
        throw new TypeError(`Invalid hex char ${char}`);
    }
    if (char < 58) {
        // 0-9
        return char - 48;
    }

    if (char < 65) {
        throw new TypeError(`Invalid hex char ${char}`);
    }
    if (char < 71) {
        // A-F
        return char - 55;
    }

    if (char < 97) {
        throw new TypeError(`Invalid hex char ${char}`);
    }
    if (char < 103) {
        // a-f
        return char - 87;
    }

    throw new TypeError(`Invalid hex char ${char}`);
}

// It's 22x faster than converting `data` to string then `Number.parseInt`
// https://jsbench.me/dglha94ozl/1
export function hexToNumber(data: Uint8Array): number {
    let result = 0;
    for (let i = 0; i < data.length; i += 1) {
        result = (result << 4) | hexCharToNumber(data[i]!);
    }
    return result;
}

export function write4HexDigits(
    buffer: Uint8Array,
    index: number,
    value: number,
) {
    const start = index;
    index += 3;
    while (index >= start && value > 0) {
        const digit = value & 0xf;
        value >>= 4;
        if (digit < 10) {
            buffer[index] = digit + 48; // '0'
        } else {
            buffer[index] = digit + 87; // 'a' - 10
        }
        index -= 1;
    }
    while (index >= start) {
        buffer[index] = 48; // '0'
        index -= 1;
    }
}
