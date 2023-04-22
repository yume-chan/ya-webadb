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

/**
 * Remove emulation prevention bytes from a H.264/H.265 NAL Unit.
 *
 * The input is not modified.
 * If the input doesn't contain any emulation prevention bytes,
 * the input is returned as-is.
 * Otherwise, a new `Uint8Array` is created and returned.
 */
export function naluRemoveEmulation(buffer: Uint8Array) {
    // output will be created when first emulation prevention byte is found
    let output: Uint8Array | undefined;
    let outputOffset = 0;

    let zeroCount = 0;
    let inEmulation = false;

    let i = 0;
    scan: for (; i < buffer.length; i += 1) {
        const byte = buffer[i]!;

        if (byte === 0x00) {
            zeroCount += 1;
            continue;
        }

        // Current byte is not zero
        const prevZeroCount = zeroCount;
        zeroCount = 0;

        if (prevZeroCount < 2) {
            // zero or one `0x00`s are acceptable
            continue;
        }

        if (byte === 0x01) {
            // Unexpected start code
            throw new Error("Invalid data");
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

                // Create output and copy the data before the emulation prevention byte
                // Output size is unknown, so we use the input size as an upper bound
                output = new Uint8Array(buffer.length - 1);
                output.set(buffer.subarray(0, i));
                outputOffset = i;
                i += 1;
                break scan;
            default:
                // `0x000004` or larger are as-is
                break;
        }
    }

    if (!output) {
        return buffer;
    }

    // Continue at the byte after the emulation prevention byte
    for (; i < buffer.length; i += 1) {
        const byte = buffer[i]!;

        output[outputOffset] = byte;
        outputOffset += 1;

        if (inEmulation) {
            if (byte > 0x03) {
                // `0x00000304` or larger are invalid
                throw new Error("Invalid data");
            }

            // `00000300000300` results in `0000000000` (both `0x03` are removed)
            // which means the `0x00` after `0x03` also counts
            if (byte === 0x00) {
                zeroCount += 1;
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

        if (prevZeroCount < 2) {
            // zero or one `0x00`s are acceptable
            continue;
        }

        if (byte === 0x01) {
            // Unexpected start code
            throw new Error("Invalid data");
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

                // Remove the emulation prevention byte
                outputOffset -= 1;
                break;
            default:
                // `0x000004` or larger are as-is
                break;
        }
    }

    return output.subarray(0, outputOffset);
}

export class NaluSodbBitReader {
    private readonly _nalu: Uint8Array;
    private readonly _byteLength: number;
    private readonly _stopBitIndex: number;

    private _zeroCount = 0;
    private _bytePosition = -1;
    private _bitPosition = -1;
    private _byte = 0;

    public get byteLength() {
        return this._byteLength;
    }

    public get stopBitIndex() {
        return this._stopBitIndex;
    }

    public get bytePosition() {
        return this._bytePosition;
    }

    public get bitPosition() {
        return this._bitPosition;
    }

    public get ended() {
        return (
            this._bytePosition === this._byteLength &&
            this._bitPosition === this._stopBitIndex
        );
    }

    public constructor(nalu: Uint8Array) {
        this._nalu = nalu;

        for (let i = nalu.length - 1; i >= 0; i -= 1) {
            if (this._nalu[i] === 0) {
                continue;
            }

            const byte = nalu[i]!;
            for (let j = 0; j < 8; j += 1) {
                if (((byte >> j) & 1) === 1) {
                    this._byteLength = i;
                    this._stopBitIndex = j;
                    this.readByte();
                    return;
                }
            }
        }

        throw new Error("End bit not found");
    }

    private readByte() {
        this._byte = this._nalu[this._bytePosition]!;
        if (this._zeroCount === 2 && this._byte === 3) {
            this._zeroCount = 0;
            this._bytePosition += 1;
            this.readByte();
            return;
        }

        if (this._byte === 0) {
            this._zeroCount += 1;
        } else {
            this._zeroCount = 0;
        }
    }

    public next() {
        if (this._bitPosition === -1) {
            this._bitPosition = 7;
            this._bytePosition += 1;
            this.readByte();
        }

        if (
            this._bytePosition === this._byteLength &&
            this._bitPosition === this._stopBitIndex
        ) {
            throw new Error("Bit index out of bounds");
        }

        const value = (this._byte >> this._bitPosition) & 1;
        this._bitPosition -= 1;
        return value;
    }

    public read(length: number): number {
        if (length > 32) {
            throw new Error("Read length too large");
        }

        let result = 0;
        for (let i = 0; i < length; i += 1) {
            result = (result << 1) | this.next();
        }
        return result;
    }

    public skip(length: number) {
        for (let i = 0; i < length; i += 1) {
            this.next();
        }
    }

    public decodeExponentialGolombNumber(): number {
        let length = 0;
        while (this.next() === 0) {
            length += 1;
        }
        if (length === 0) {
            return 0;
        }
        return ((1 << length) | this.read(length)) - 1;
    }

    public peek(length: number) {
        const { _zeroCount, _bytePosition, _bitPosition, _byte } = this;
        const result = this.read(length);
        Object.assign(this, { _zeroCount, _bytePosition, _bitPosition, _byte });
        return result;
    }

    public readBytes(length: number): Uint8Array {
        const result = new Uint8Array(length);
        for (let i = 0; i < length; i += 1) {
            result[i] = this.read(8);
        }
        return result;
    }

    public peekBytes(length: number): Uint8Array {
        const { _zeroCount, _bytePosition, _bitPosition, _byte } = this;
        const result = this.readBytes(length);
        Object.assign(this, { _zeroCount, _bytePosition, _bitPosition, _byte });
        return result;
    }
}
