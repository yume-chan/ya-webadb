let characterSet: string[] = [];
const pairs = [
    ['A', 'Z'],
    ['a', 'z'],
    ['0', '9'],
].map(pair => pair.map(character => character.charCodeAt(0)));

for (const [begin, end] of pairs) {
    for (let i = begin; i <= end; i += 1) {
        characterSet.push(String.fromCharCode(i));
    }
}
characterSet.push('+', '/');

export default function base64Encode(buffer: ArrayBuffer) {
    const array = new Uint8Array(buffer);
    const length = buffer.byteLength;
    const remainder = length % 3;
    let result = '';

    for (let i = 0; i < length - remainder; i += 3) {
        // aaaaaabb
        const x = array[i];
        // bbbbcccc
        const y = array[i + 1];
        // ccdddddd
        const z = array[i + 2];

        const a = x >> 2;
        const b = ((x & 0b11) << 4) | (y >> 4);
        const c = ((y & 0b1111) << 2) | (z >> 6);
        const d = z & 0b111111;

        result += characterSet[a] + characterSet[b] + characterSet[c] + characterSet[d];
    }

    if (remainder === 1) {
        // aaaaaabb
        const x = array[length - 1];

        const a = x >> 2;
        const b = ((x & 0b11) << 4);

        result += characterSet[a] + characterSet[b] + '==';
    } else if (remainder === 2) {
        // aaaaaabb
        const x = array[length - 2];
        // bbbbcccc
        const y = array[length - 1];

        const a = x >> 2;
        const b = ((x & 0b11) << 4) | (y >> 4);
        const c = ((y & 0b1111) << 2);

        result += characterSet[a] + characterSet[b] + characterSet[c] + '=';
    }

    return result;
}
