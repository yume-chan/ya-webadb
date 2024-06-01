/**
 * Split NAL units from an H.264/H.265 Annex B stream.
 *
 * The input is not modified.
 * The returned NAL units are views of the input (no memory allocation nor copy),
 * and still contains emulation prevention bytes.
 *
 * This methods returns a generator, so it can be stopped immediately
 * after the interested NAL unit is found.
 */
export function* annexBSplitNalu(buffer: Uint8Array): Generator<Uint8Array> {
    // -1 means we haven't found the first start code
    let start = -1;
    // How many `0x00`s in a row we have counted
    let zeroCount = 0;
    let inEmulation = false;

    for (let i = 0; i < buffer.length; i += 1) {
        const byte = buffer[i]!;

        if (inEmulation) {
            if (byte > 0x03) {
                // `0x00000304` or larger are invalid
                throw new Error("Invalid data");
            }

            inEmulation = false;
            continue;
        }

        if (byte === 0x00) {
            zeroCount += 1;
            continue;
        }

        const prevZeroCount = zeroCount;
        zeroCount = 0;

        if (start === -1) {
            // 0x000001 is the start code
            // But it can be preceded by any number of zeros
            // So 2 is the minimal
            if (prevZeroCount >= 2 && byte === 0x01) {
                // Found start of first NAL unit
                start = i + 1;
                continue;
            }

            // Not begin with start code
            throw new Error("Invalid data");
        }

        if (prevZeroCount < 2) {
            // zero or one `0x00`s are acceptable
            continue;
        }

        if (byte === 0x01) {
            // Found another NAL unit
            yield buffer.subarray(start, i - prevZeroCount);

            start = i + 1;
            continue;
        }

        if (prevZeroCount > 2) {
            // Too much `0x00`s
            throw new Error("Invalid data");
        }

        switch (byte) {
            case 0x02:
                // Didn't find why, but 7.4.1 NAL unit semantics forbids `0x000002` appearing in NAL units
                throw new Error("Invalid data");
            case 0x03:
                // `0x000003` is the "emulation_prevention_three_byte"
                // `0x00000300`, `0x00000301`, `0x00000302` and `0x00000303` represent
                // `0x000000`, `0x000001`, `0x000002` and `0x000003` respectively
                inEmulation = true;
                break;
            default:
                // `0x000004` or larger are as-is
                break;
        }
    }

    if (inEmulation) {
        throw new Error("Invalid data");
    }

    yield buffer.subarray(start, buffer.length);
}

export class NaluSodbBitReader {
    readonly #nalu: Uint8Array;
    // logical length is `#byteLength * 8 + (7 - #stopBitIndex)`
    readonly #byteLength: number;
    readonly #stopBitIndex: number;

    #zeroCount = 0;

    // logical position is `#bytePosition * 8 + (7 - #bitPosition)`
    #bytePosition = 0;
    #bitPosition = 7;
    #byte = 0;

    get byteLength() {
        return this.#byteLength;
    }

    get stopBitIndex() {
        return this.#stopBitIndex;
    }

    get bytePosition() {
        return this.#bytePosition;
    }

    get bitPosition() {
        return this.#bitPosition;
    }

    get ended() {
        return (
            this.#bytePosition >= this.#byteLength &&
            this.#bitPosition <= this.#stopBitIndex
        );
    }

    constructor(nalu: Uint8Array) {
        this.#nalu = nalu;

        // Search for the last bit being `1`, also known as the stop bit
        for (let i = nalu.length - 1; i >= 0; i -= 1) {
            if (this.#nalu[i] === 0) {
                continue;
            }

            const byte = nalu[i]!;
            for (let j = 0; j < 8; j += 1) {
                if (((byte >> j) & 1) === 1) {
                    this.#byteLength = i;
                    this.#stopBitIndex = j;
                    this.#loadByte();
                    return;
                }
            }
        }

        throw new Error("Stop bit not found");
    }

    #loadByte() {
        this.#byte = this.#nalu[this.#bytePosition]!;

        // If the current sequence is `0x000003`, skip to the next byte.
        // `annexBSplitNalu` had validated the input, so skip the check here
        if (this.#zeroCount === 2 && this.#byte === 3) {
            this.#zeroCount = 0;
            this.#bytePosition += 1;
            // Call `#loadByte` again, because if the next byte is `0x00`,
            // it need to be counted in `#zeroCount` as well.
            this.#loadByte();
            return;
        }

        // `0x00000301` becomes `0x000001`, so only the `0x03` byte needs to be skipped
        // All `0x00` bytes are returned as-is
        if (this.#byte === 0) {
            this.#zeroCount += 1;
        } else {
            this.#zeroCount = 0;
        }
    }

    next() {
        if (this.ended) {
            throw new Error("Bit index out of bounds");
        }

        const value = (this.#byte >> this.#bitPosition) & 1;

        this.#bitPosition -= 1;
        if (this.#bitPosition < 0) {
            this.#bytePosition += 1;
            this.#bitPosition = 7;
            this.#loadByte();
        }

        return value;
    }

    read(length: number): number {
        if (length > 32) {
            throw new Error("Read length too large");
        }

        let result = 0;
        for (let i = 0; i < length; i += 1) {
            result = (result << 1) | this.next();
        }
        return result;
    }

    /**
     * Throws an error if the current position is invalid for `skip`.
     *
     * Usually it will throw if `ended` is `true`,
     * except when the bit position is at the stop bit,
     * in which case `ended` will be `true`, but it won't throw.
     * `skip` can skip all remaining bits, and stop at the end position.
     * The next `next` call will throw since there is no more bits to read.
     */
    #checkSkipPosition() {
        if (
            this.#bytePosition >= this.#byteLength &&
            this.#bitPosition < this.#stopBitIndex
        ) {
            throw new Error("Bit index out of bounds");
        }
    }

    skip(length: number) {
        if (length <= this.#bitPosition + 1) {
            this.#bitPosition -= length;
            this.#checkSkipPosition();
            return;
        }

        // Because of emulation prevention bytes,
        // we don't know how many bits are left in the NAL,
        // nor how many bits should be skipped.
        // So we need to check each byte.

        length -= this.#bitPosition + 1;
        this.#bytePosition += 1;
        this.#bitPosition = 7;
        this.#loadByte();
        this.#checkSkipPosition();

        for (; length >= 8; length -= 8) {
            this.#bytePosition += 1;
            this.#loadByte();
            this.#checkSkipPosition();
        }

        this.#bitPosition = 7 - length;
        this.#checkSkipPosition();
    }

    decodeExponentialGolombNumber(): number {
        let length = 0;
        while (this.next() === 0) {
            length += 1;
        }
        if (length === 0) {
            return 0;
        }
        return ((1 << length) | this.read(length)) - 1;
    }

    #save() {
        return {
            zeroCount: this.#zeroCount,
            bytePosition: this.#bytePosition,
            bitPosition: this.#bitPosition,
            byte: this.#byte,
        };
    }

    #restore(state: {
        zeroCount: number;
        bytePosition: number;
        bitPosition: number;
        byte: number;
    }) {
        this.#zeroCount = state.zeroCount;
        this.#bytePosition = state.bytePosition;
        this.#bitPosition = state.bitPosition;
        this.#byte = state.byte;
    }

    peek(length: number) {
        const state = this.#save();
        const result = this.read(length);
        this.#restore(state);
        return result;
    }

    readBytes(length: number): Uint8Array {
        const result = new Uint8Array(length);
        for (let i = 0; i < length; i += 1) {
            result[i] = this.read(8);
        }
        return result;
    }

    peekBytes(length: number): Uint8Array {
        const state = this.#save();
        const result = this.readBytes(length);
        this.#restore(state);
        return result;
    }
}
