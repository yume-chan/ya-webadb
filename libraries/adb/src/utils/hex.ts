function hexCharToNumber(char: number) {
    if (char < 48) {
        throw new Error(`Invalid hex char ${char}`);
    }
    if (char < 58) {
        // 0-9
        return char - 48;
    }

    if (char < 65) {
        throw new Error(`Invalid hex char ${char}`);
    }
    if (char < 71) {
        // A-F
        return char - 55;
    }

    if (char < 97) {
        throw new Error(`Invalid hex char ${char}`);
    }
    if (char < 103) {
        // a-f
        return char - 87;
    }

    throw new Error(`Invalid hex char ${char}`);
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

export function numberToHex(value: number) {
    const result = new Uint8Array(4);
    let index = 3;
    while (index >= 0 && value > 0) {
        const digit = value & 0xf;
        value >>= 4;
        if (digit < 10) {
            result[index] = digit + 48;
        } else {
            result[index] = digit + 87;
        }
        index -= 1;
    }
    while (index >= 0) {
        // '0'
        result[index] = 48;
        index -= 1;
    }
    return result;
}
