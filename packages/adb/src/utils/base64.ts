interface Base64CharRange {
    start: number;

    length: number;

    end: number;

    offset: number;
}

let ranges: Base64CharRange[] = [];
const chars: number[] = [];
const padding = '='.charCodeAt(0);

let offset = 0;
function addRange(start: string, end: string) {
    const startCharCode = start.charCodeAt(0);
    const endCharCode = end.charCodeAt(0);
    const length = endCharCode - startCharCode + 1;

    for (let i = startCharCode; i <= endCharCode; i++) {
        chars.push(i);
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

export function calculateBase64EncodedLength(inputLength: number): number {
    const paddingLength = inputLength % 3;
    return (inputLength + 3 - paddingLength) / 3 * 4;
}

export function encodeBase64(
    input: ArrayBuffer | Uint8Array,
    inputOffset?: number,
    inputLength?: number,
): ArrayBuffer;
export function encodeBase64(
    input: ArrayBuffer | Uint8Array,
    output: ArrayBuffer | Uint8Array,
    outputOffset?: number
): number;
export function encodeBase64(
    input: ArrayBuffer | Uint8Array,
    inputOffset: number,
    output: ArrayBuffer | Uint8Array,
    outputOffset?: number
): number;
export function encodeBase64(
    input: ArrayBuffer | Uint8Array,
    inputOffset: number,
    inputLength: number,
    output: ArrayBuffer | Uint8Array,
    outputOffset?: number
): number;
export function encodeBase64(
    input: ArrayBuffer | Uint8Array,
    arg1?: number | ArrayBuffer | Uint8Array,
    arg2?: number | ArrayBuffer | Uint8Array,
    _arg3?: number | ArrayBuffer | Uint8Array,
    _arg4?: number,
): ArrayBuffer | Uint8Array | number {
    if (input instanceof ArrayBuffer) {
        input = new Uint8Array(input);
    }

    // Because `Uint8Array` is type compatible with `ArrayBuffer`,
    // TypeScript doesn't correctly narrow `input` to `Uint8Array` when assigning.
    // Manually eliminate `ArrayBuffer` from `input` with a type guard.
    if (input instanceof ArrayBuffer) {
        return input;
    }

    let inputOffset: number;
    let inputLength: number;
    let output: Uint8Array;
    let outputOffset: number;

    let outputArgumentIndex: number;
    if (typeof arg1 !== 'number') {
        inputOffset = 0;
        inputLength = input.byteLength;
        outputArgumentIndex = 1;
    } else {
        inputOffset = arg1;

        if (typeof arg2 !== 'number') {
            inputLength = input.byteLength - inputOffset;
            outputArgumentIndex = 2;
        } else {
            inputLength = arg2;
            outputArgumentIndex = 3;
        }
    }

    const extraBytes = inputLength % 3;
    const outputLength = (inputLength + 3 - extraBytes) / 3 * 4;

    let maybeOutput: ArrayBuffer | Uint8Array | undefined = arguments[outputArgumentIndex];
    let outputType: 'ArrayBuffer' | 'number';
    if (maybeOutput) {
        outputOffset = arguments[outputArgumentIndex + 1] ?? 0;

        if (maybeOutput.byteLength - outputOffset < outputLength) {
            throw new Error('output buffer is too small');
        }

        if (maybeOutput instanceof ArrayBuffer) {
            output = new Uint8Array(maybeOutput);
        } else {
            output = maybeOutput;
        }

        outputType = 'number';
    } else {
        const buffer = new ArrayBuffer(outputLength);
        output = new Uint8Array(buffer);
        outputOffset = 0;
        outputType = 'ArrayBuffer';
    }

    // Because `Uint8Array` is type compatible with `ArrayBuffer`,
    // TypeScript doesn't correctly narrow `output` to `Uint8Array` when assigning.
    // Manually eliminate `ArrayBuffer` from `output` with a type guard.
    if (output instanceof ArrayBuffer) {
        return output;
    }

    if (input.buffer === output.buffer) {
        const bufferInputStart = input.byteOffset + inputOffset;
        const bufferOutputStart = output.byteOffset + outputOffset;
        if (bufferOutputStart < bufferInputStart - 1) {
            const bufferOutputEnd = bufferOutputStart + outputLength;
            if (bufferOutputEnd >= bufferInputStart) {
                throw new Error('input and output buffer can not be overlapping');
            }
        }
    }

    let inputIndex = inputOffset + inputLength - 1;
    let outputIndex = outputOffset + outputLength - 1;

    if (extraBytes === 1) {
        // aaaaaabb
        const x = input[inputIndex];
        inputIndex -= 1;

        output[outputIndex] = padding;
        outputIndex -= 1;

        output[outputIndex] = padding;
        outputIndex -= 1;

        output[outputIndex] = chars[((x & 0b11) << 4)];
        outputIndex -= 1;

        output[outputIndex] = chars[x >> 2];
        outputIndex -= 1;
    } else if (extraBytes === 2) {
        // bbbbcccc
        const y = input[inputIndex];
        inputIndex -= 1;

        // aaaaaabb
        const x = input[inputIndex];
        inputIndex -= 1;

        output[outputIndex] = padding;
        outputIndex -= 1;

        output[outputIndex] = chars[((y & 0b1111) << 2)];
        outputIndex -= 1;

        output[outputIndex] = chars[((x & 0b11) << 4) | (y >> 4)];
        outputIndex -= 1;

        output[outputIndex] = chars[x >> 2];
        outputIndex -= 1;
    }

    while (inputIndex >= inputOffset) {
        // ccdddddd
        const z = input[inputIndex];
        inputIndex -= 1;

        // bbbbcccc
        const y = input[inputIndex];
        inputIndex -= 1;

        // aaaaaabb
        const x = input[inputIndex];
        inputIndex -= 1;

        output[outputIndex] = chars[z & 0b111111];
        outputIndex -= 1;

        output[outputIndex] = chars[((y & 0b1111) << 2) | (z >> 6)];
        outputIndex -= 1;

        output[outputIndex] = chars[((x & 0b11) << 4) | (y >> 4)];
        outputIndex -= 1;

        output[outputIndex] = chars[x >> 2];
        outputIndex -= 1;
    }

    if (outputType === 'ArrayBuffer') {
        return output.buffer;
    } else {
        return outputLength;
    }
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
