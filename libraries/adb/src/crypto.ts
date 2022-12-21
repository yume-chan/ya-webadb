import {
    getBigUint64,
    setBigUint64,
} from "@yume-chan/dataview-bigint-polyfill/esm/fallback.js";

const BigInt0 = BigInt(0);
const BigInt1 = BigInt(1);
const BigInt2 = BigInt(2);
const BigInt64 = BigInt(64);

/**
 * Gets the `BigInt` value at the specified byte offset and length from the start of the view. There is
 * no alignment constraint; multi-byte values may be fetched from any offset.
 *
 * Only supports Big-Endian, because that's what ADB uses.
 * @param byteOffset The place in the buffer at which the value should be retrieved.
 */
export function getBigUint(
    dataView: DataView,
    byteOffset: number,
    length: number
): bigint {
    let result = BigInt0;

    // Currently `length` must be a multiplication of 8
    // Support for arbitrary length can be easily added

    for (let i = byteOffset; i < byteOffset + length; i += 8) {
        result <<= BigInt64;
        const value = getBigUint64(dataView, i, false);
        result += value;
    }

    return result;
}

/**
 * Stores an arbitrary-precision positive `BigInt` value at the specified byte offset from the start of the view.
 * @param byteOffset The place in the buffer at which the value should be set.
 * @param value The value to set.
 * @param littleEndian If `false` or `undefined`, a big-endian value should be written,
 * otherwise a little-endian value should be written.
 */
export function setBigUint(
    dataView: DataView,
    byteOffset: number,
    value: bigint,
    littleEndian?: boolean
) {
    const start = byteOffset;

    if (littleEndian) {
        while (value > BigInt0) {
            setBigUint64(dataView, byteOffset, value, true);
            byteOffset += 8;
            value >>= BigInt64;
        }
    } else {
        // Because we don't know how long (in bits) the `value` is,
        // Convert it to an array of `uint64` first.
        const uint64Array: bigint[] = [];
        while (value > BigInt0) {
            uint64Array.push(BigInt.asUintN(64, value));
            value >>= BigInt64;
        }

        for (let i = uint64Array.length - 1; i >= 0; i -= 1) {
            setBigUint64(dataView, byteOffset, uint64Array[i]!, false);
            byteOffset += 8;
        }
    }

    return byteOffset - start;
}

// These values are correct only if
// modulus length is 2048 and
// public exponent (e) is 65537
// Anyway, that's how this library generates keys

// To support other parameters,
// a proper ASN.1 parser can be used

// References:
//
//   https://tools.ietf.org/html/rfc8017#appendix-A.1.2
//   PKCS #1: RSA Cryptography Specifications Version 2.2
//     A.1.2.  RSA Private Key Syntax
//
//   https://lapo.it/asn1js/
//   https://github.com/lapo-luchini/asn1js
//   ASN.1 JavaScript decoder
//
//   https://www.itu.int/rec/T-REC-X.690-201508-I/en
//   X.690: Specification of Distinguished Encoding Rules (DER)

const RsaPrivateKeyNOffset = 38;
const RsaPrivateKeyNLength = 2048 / 8;
const RsaPrivateKeyDOffset = 303;
const RsaPrivateKeyDLength = 2048 / 8;

export function parsePrivateKey(key: Uint8Array): [n: bigint, d: bigint] {
    const view = new DataView(key.buffer, key.byteOffset, key.byteLength);
    const n = getBigUint(view, RsaPrivateKeyNOffset, RsaPrivateKeyNLength);
    const d = getBigUint(view, RsaPrivateKeyDOffset, RsaPrivateKeyDLength);
    return [n, d];
}

// Taken from https://stackoverflow.com/a/51562038
// I can't understand, but it does work
// Only used with numbers smaller than 2^32 so doesn't need BigInt
export function modInverse(a: number, m: number) {
    a = ((a % m) + m) % m;
    if (!a || m < 2) {
        return NaN; // invalid input
    }
    // find the gcd
    const s = [];
    let b = m;
    while (b) {
        [a, b] = [b, a % b];
        s.push({ a, b });
    }
    if (a !== 1) {
        return NaN; // inverse does not exists
    }
    // find the inverse
    let x = 1;
    let y = 0;
    for (let i = s.length - 2; i >= 0; i -= 1) {
        [x, y] = [y, x - y * Math.floor(s[i]!.a / s[i]!.b)];
    }
    return ((y % m) + m) % m;
}

export function calculatePublicKeyLength() {
    return 4 + 4 + 2048 / 8 + 2048 / 8 + 4;
}

export function calculatePublicKey(privateKey: Uint8Array): Uint8Array;
export function calculatePublicKey(
    privateKey: Uint8Array,
    output: Uint8Array
): number;
export function calculatePublicKey(
    privateKey: Uint8Array,
    output?: Uint8Array
): Uint8Array | number {
    // Android has its own public key generation algorithm
    // See https://android.googlesource.com/platform/system/core.git/+/91784040db2b9273687f88d8b95f729d4a61ecc2/libcrypto_utils/android_pubkey.cpp#111

    // The public key is an array of
    //
    // [
    //   modulusLengthInWords, // 32-bit integer, a "word" is 32-bit so it must be 2048 / 8 / 4
    //                         // Actually the comment in Android source code was wrong
    //   n0inv,                // 32-bit integer, the modular inverse of (low 32 bits of n)
    //   modulus,              // n
    //   rr,                   // Montgomery parameter R^2
    //   exponent,             // 32-bit integer, must be 65537
    // ]
    //
    // (All in little endian)
    // See https://android.googlesource.com/platform/system/core.git/+/91784040db2b9273687f88d8b95f729d4a61ecc2/libcrypto_utils/android_pubkey.cpp#38

    // extract `n` from private key
    const [n] = parsePrivateKey(privateKey);

    let outputType: "Uint8Array" | "number";
    const outputLength = calculatePublicKeyLength();
    if (!output) {
        output = new Uint8Array(outputLength);
        outputType = "Uint8Array";
    } else {
        if (output.byteLength < outputLength) {
            throw new Error("output buffer is too small");
        }

        outputType = "number";
    }

    const outputView = new DataView(
        output.buffer,
        output.byteOffset,
        output.byteLength
    );
    let outputOffset = 0;

    // modulusLengthInWords
    outputView.setUint32(outputOffset, 2048 / 8 / 4, true);
    outputOffset += 4;

    // Calculate `n0inv`
    // Don't know why need to multiple -1
    // Didn't exist in Android codebase
    const n0inv = modInverse(
        Number(BigInt.asUintN(32, n) * BigInt(-1)),
        2 ** 32
    );
    outputView.setUint32(outputOffset, n0inv, true);
    outputOffset += 4;

    // Write n
    setBigUint(outputView, outputOffset, n, true);
    outputOffset += 256;

    // Calculate rr = (2^(rsa_size)) ^ 2 mod n
    const rr = BigInt(2) ** BigInt(4096) % n;
    outputOffset += setBigUint(outputView, outputOffset, rr, true);

    // exponent
    outputView.setUint32(outputOffset, 65537, true);
    outputOffset += 4;

    if (outputType === "Uint8Array") {
        return output;
    } else {
        return outputLength;
    }
}

/**
 * Modular exponentiation.
 *
 * Calculate `(base ** exponent) % modulus` without actually calculating `(base ** exponent)`.
 *
 * See https://en.wikipedia.org/wiki/Modular_exponentiation#Implementation_in_Lua
 */
export function powMod(
    base: bigint,
    exponent: bigint,
    modulus: bigint
): bigint {
    if (modulus === BigInt1) {
        return BigInt0;
    }

    let r = BigInt1;
    base = base % modulus;

    while (exponent > BigInt0) {
        if (BigInt.asUintN(1, exponent) === BigInt1) {
            r = (r * base) % modulus;
        }

        exponent >>= BigInt1;
        base = base ** BigInt2 % modulus;
    }

    return r;
}

export const SHA1_DIGEST_LENGTH = 20;

export const ASN1_SEQUENCE = 0x30;
export const ASN1_OCTET_STRING = 0x04;
export const ASN1_NULL = 0x05;
export const ASN1_OID = 0x06;

// PKCS#1 SHA-1 hash digest info
export const SHA1_DIGEST_INFO = new Uint8Array([
    ASN1_SEQUENCE,
    0x0d + SHA1_DIGEST_LENGTH,
    ASN1_SEQUENCE,
    0x09,
    // SHA-1 (1 3 14 3 2 26)
    ASN1_OID,
    0x05,
    1 * 40 + 3,
    14,
    3,
    2,
    26,
    ASN1_NULL,
    0x00,
    ASN1_OCTET_STRING,
    SHA1_DIGEST_LENGTH,
]);

// SubtleCrypto.sign() will hash the given data and sign the hash
// But we don't need the hashing step
// (In another word, ADB just requires the client to
// encrypt the given data with its private key)
// However SubtileCrypto.encrypt() doesn't accept 'RSASSA-PKCS1-v1_5' algorithm
// So we need to implement the encryption by ourself
export function sign(privateKey: Uint8Array, data: Uint8Array): Uint8Array {
    const [n, d] = parsePrivateKey(privateKey);

    // PKCS#1 padding
    const padded = new Uint8Array(256);
    let index = 0;

    padded[index] = 0;
    index += 1;

    padded[index] = 1;
    index += 1;

    const fillLength =
        padded.length - SHA1_DIGEST_INFO.length - data.length - 1;
    while (index < fillLength) {
        padded[index] = 0xff;
        index += 1;
    }

    padded[index] = 0;
    index += 1;

    padded.set(SHA1_DIGEST_INFO, index);
    index += SHA1_DIGEST_INFO.length;

    padded.set(data, index);

    // Encryption
    // signature = padded ** d % n
    const view = new DataView(padded.buffer);
    const signature = powMod(getBigUint(view, 0, view.byteLength), d, n);

    // `padded` is not used anymore,
    // re-use the buffer to store the result
    setBigUint(view, 0, signature, false);

    return padded;
}
