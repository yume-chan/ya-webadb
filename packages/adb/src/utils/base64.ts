interface Base64CharRange {
    start: number;

    length: number;

    end: number;

    offset: number;
}

let ranges: Base64CharRange[] = [];
let chars: string[] = [];

let offset = 0;
function addRange(start: string, end: string) {
    const startCharCode = start.charCodeAt(0);
    const endCharCode = end.charCodeAt(0);
    const length = endCharCode - startCharCode + 1;

    for (let i = startCharCode; i <= endCharCode; i++) {
        chars.push(String.fromCharCode(i));
    }

    ranges.push({
        start: startCharCode,
        length: length,
        end: endCharCode,
        offset: startCharCode - offset,
    });

    offset += length;
}

addRange('A', 'Z');
addRange('a', 'z');
addRange('0', '9');
addRange('+', '+');
addRange('/', '/');

ranges = ranges.sort((a, b) => a.end - b.end);

function toValue(char: string): number {
    const charCode = char.charCodeAt(0);

    let start = 0;
    let end = ranges.length - 1;
    let i = end >> 1;

    while (true) {
        const range = ranges[i];
        if (charCode < range.start) {
            end = i - 1;
        } else if (charCode > range.end) {
            start = i + 1;
        } else {
            return charCode - range.offset;
        }
        i = (start + end) >> 1;
    }
}

export function encodeBase64(buffer: ArrayBuffer): string {
    const array = new Uint8Array(buffer);
    const length = buffer.byteLength;
    const remainder = length % 3;
    let result = '';

    let i = 0;
    for (; i < length - remainder;) {
        // aaaaaabb
        const x = array[i];
        i += 1;
        // bbbbcccc
        const y = array[i];
        i += 1;
        // ccdddddd
        const z = array[i];
        i += 1;

        result += chars[x >> 2];
        result += chars[((x & 0b11) << 4) | (y >> 4)];
        result += chars[((y & 0b1111) << 2) | (z >> 6)];
        result += chars[z & 0b111111];
    }

    if (remainder === 1) {
        // aaaaaabb
        const x = array[i];

        result += chars[x >> 2];
        result += chars[((x & 0b11) << 4)];
        result += '==';
    } else if (remainder === 2) {
        // aaaaaabb
        const x = array[i];
        i += 1;
        // bbbbcccc
        const y = array[i];

        result += chars[x >> 2];
        result += chars[((x & 0b11) << 4) | (y >> 4)];
        result += chars[((y & 0b1111) << 2)];
        result += '=';
    }

    return result;
}

export function decodeBase64(input: string): ArrayBuffer {
    let padding: number;
    if (input[input.length - 2] === '=') {
        padding = 2;
    } else if (input[input.length - 1] === '=') {
        padding = 1;
    } else {
        padding = 0;
    }

    const result = new Uint8Array(input.length / 4 * 3 - padding);
    let sIndex = 0;
    let dIndex = 0;

    while (sIndex < input.length - (padding !== 0 ? 4 : 0)) {
        const a = toValue(input[sIndex]);
        sIndex += 1;

        const b = toValue(input[sIndex]);
        sIndex += 1;

        const c = toValue(input[sIndex]);
        sIndex += 1;

        const d = toValue(input[sIndex]);
        sIndex += 1;

        result[dIndex] = (a << 2) | ((b & 0b11_0000) >> 4);
        dIndex += 1;

        result[dIndex] = ((b & 0b1111) << 4) | ((c & 0b11_1100) >> 2);
        dIndex += 1;

        result[dIndex] = ((c & 0b11) << 6) | d;
        dIndex += 1;
    }

    if (padding === 1) {
        const a = toValue(input[sIndex]);
        sIndex += 1;

        const b = toValue(input[sIndex]);
        sIndex += 1;

        const c = toValue(input[sIndex]);

        result[dIndex] = (a << 2) | ((b & 0b11_0000) >> 4);
        dIndex += 1;

        result[dIndex] = ((b & 0b1111) << 4) | ((c & 0b11_1100) >> 2);
    } else if (padding === 2) {
        const a = toValue(input[sIndex]);
        sIndex += 1;

        const b = toValue(input[sIndex]);

        result[dIndex] = (a << 2) | ((b & 0b11_0000) >> 4);
    }

    return result.buffer;
}
