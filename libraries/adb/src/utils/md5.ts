import {
    getUint32LittleEndian,
    setUint32LittleEndian,
    setUint64LittleEndian,
} from "@yume-chan/no-data-view";

// Taken from https://github.com/digitalbazaar/forge/blob/e3c68e9695607702587583cda291d74e5369f21c/tests/unit/md5.js#L103
// LICENSE: https://github.com/digitalbazaar/forge/blob/2c37d0bd2864199409edbb520f674d1c93652b23/LICENSE

// g values
// prettier-ignore
const gs = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    1, 6, 11, 0, 5, 10, 15, 4, 9, 14, 3, 8, 13, 2, 7, 12,
    5, 8, 11, 14, 1, 4, 7, 10, 13, 0, 3, 6, 9, 12, 15, 2,
    0, 7, 14, 5, 12, 3, 10, 1, 8, 15, 6, 13, 4, 11, 2, 9];

// rounds table
// prettier-ignore
const rs = [
    7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,
    5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,
    4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,
    6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21];

export class Md5 {
    static #k = new Uint32Array(64);

    static {
        for (let i = 0; i < 64; i += 1) {
            // get the result of abs(sin(i + 1)) as a 32-bit integer
            Md5.#k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000);
        }
    }

    #state = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]);
    #length = 0n;

    #buffer = new Uint8Array(64);
    #bufferLength = 0;

    #w = new Uint32Array(16);

    update(input: Uint8Array) {
        this.#length += BigInt(input.length);

        let offset = 0;

        if (this.#bufferLength) {
            const remaining = 64 - this.#bufferLength;
            this.#buffer.set(input.subarray(0, remaining), this.#bufferLength);

            if (input.length < remaining) {
                this.#bufferLength += input.length;
                return this;
            }

            this.#update(this.#buffer);
            this.#bufferLength = 0;
            offset = remaining;
        }

        const end = input.length - 64;
        for (; offset <= end; offset += 64) {
            this.#update(input, offset);
        }

        if (offset < input.length) {
            this.#buffer.set(input.subarray(offset));
            this.#bufferLength = input.length - offset;
        }

        return this;
    }

    #update(input: Uint8Array, offset = 0) {
        let a = this.#state[0]!;
        let b = this.#state[1]!;
        let c = this.#state[2]!;
        let d = this.#state[3]!;

        let t = 0;
        let f = 0;
        let r = 0;
        let i = 0;

        // round 1
        for (; i < 16; i += 1) {
            this.#w[i] = getUint32LittleEndian(input, offset + i * 4);
            f = d ^ (b & (c ^ d));
            t = a + f + Md5.#k[i]! + this.#w[i]!;
            r = rs[i]!;
            a = d;
            d = c;
            c = b;
            b += (t << r) | (t >>> (32 - r));
        }

        // round 2
        for (; i < 32; i += 1) {
            f = c ^ (d & (b ^ c));
            t = a + f + Md5.#k[i]! + this.#w[gs[i]!]!;
            r = rs[i]!;
            a = d;
            d = c;
            c = b;
            b += (t << r) | (t >>> (32 - r));
        }

        // round 3
        for (; i < 48; i += 1) {
            f = b ^ c ^ d;
            t = a + f + Md5.#k[i]! + this.#w[gs[i]!]!;
            r = rs[i]!;
            a = d;
            d = c;
            c = b;
            b += (t << r) | (t >>> (32 - r));
        }

        // round 4
        for (; i < 64; i += 1) {
            f = c ^ (b | ~d);
            t = a + f + Md5.#k[i]! + this.#w[gs[i]!]!;
            r = rs[i]!;
            a = d;
            d = c;
            c = b;
            b += (t << r) | (t >>> (32 - r));
        }

        this.#state[0]! += a;
        this.#state[1]! += b;
        this.#state[2]! += c;
        this.#state[3]! += d;
    }

    digest() {
        this.#buffer[this.#bufferLength] = 0x80;
        this.#buffer.subarray(this.#bufferLength + 1).fill(0);

        if (64 - this.#bufferLength < 8) {
            this.#update(this.#buffer);

            this.#buffer.fill(0);
            this.#bufferLength = 0;
        }

        setUint64LittleEndian(
            this.#buffer,
            this.#buffer.length - 8,
            this.#length << 3n,
        );
        this.#update(this.#buffer);

        const result = new Uint8Array(16);
        setUint32LittleEndian(result, 0, this.#state[0]!);
        setUint32LittleEndian(result, 4, this.#state[1]!);
        setUint32LittleEndian(result, 8, this.#state[2]!);
        setUint32LittleEndian(result, 12, this.#state[3]!);
        return result;
    }

    reset() {
        this.#state[0] = 0x67452301;
        this.#state[1] = 0xefcdab89;
        this.#state[2] = 0x98badcfe;
        this.#state[3] = 0x10325476;
        this.#bufferLength = 0;
        this.#length = 0n;
        return this;
    }
}

let instance: Md5 | undefined;

export function md5Digest(input: Uint8Array) {
    if (!instance) {
        instance = new Md5();
    }

    const result = instance.update(input).digest();
    instance.reset();
    return result;
}
