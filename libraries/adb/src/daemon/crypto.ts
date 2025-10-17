import {
    getUint64BigEndian,
    setInt64BigEndian,
    setInt64LittleEndian,
} from "@yume-chan/no-data-view";

/**
 * Gets the `BigInt` value at the specified byte offset and length from the start of the view. There is
 * no alignment constraint; multi-byte values may be fetched from any offset.
 *
 * Only supports Big-Endian, because that's what ADB uses.
 * @param byteOffset The place in the buffer at which the value should be retrieved.
 */
export function getBigUint(
    array: Uint8Array,
    byteOffset: number,
    length: number,
): bigint {
    let result = 0n;

    // Currently `length` must be a multiplication of 8
    // Support for arbitrary length can be easily added

    for (let i = byteOffset; i < byteOffset + length; i += 8) {
        result <<= 64n;
        const value = getUint64BigEndian(array, i);
        result |= value;
    }

    return result;
}

/**
 * Stores an arbitrary-precision positive `BigInt` value at the specified byte offset from the start of the view.
 * @param byteOffset The place in the buffer at which the value should be set.
 * @param length The number of bytes to set.
 * @param value The value to set.
 * @param littleEndian If `false` or `undefined`, a big-endian value should be written,
 * otherwise a little-endian value should be written.
 */

// eslint-disable-next-line @typescript-eslint/max-params
export function setBigUint(
    array: Uint8Array,
    byteOffset: number,
    length: number,
    value: bigint,
    littleEndian?: boolean,
) {
    if (littleEndian) {
        const end = byteOffset + length;
        while (value > 0n) {
            setInt64LittleEndian(array, byteOffset, value);
            byteOffset += 8;
            value >>= 64n;
        }
        // Clear the trailing bytes
        array.subarray(byteOffset, end).fill(0);
    } else {
        let position = byteOffset + length - 8;
        while (value > 0n) {
            setInt64BigEndian(array, position, value);
            position -= 8;
            value >>= 64n;
        }
        // Clear the leading bytes
        array.subarray(byteOffset, position + 8).fill(0);
    }
}

export interface SimpleRsaPrivateKey {
    n: bigint;
    d: bigint;
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

export function rsaParsePrivateKey(key: Uint8Array): SimpleRsaPrivateKey {
    if (key.length < RsaPrivateKeyDOffset + RsaPrivateKeyDLength) {
        throw new Error(
            "RSA private key is too short. Expecting a PKCS#8 formatted RSA private key with modulus length 2048 bits and public exponent 65537.",
        );
    }

    const n = getBigUint(key, RsaPrivateKeyNOffset, RsaPrivateKeyNLength);
    const d = getBigUint(key, RsaPrivateKeyDOffset, RsaPrivateKeyDLength);
    return { n, d };
}

function nonNegativeMod(m: number, d: number) {
    const r = m % d;
    if (r > 0) {
        return r;
    }
    return r + (d > 0 ? d : -d);
}

// https://en.wikipedia.org/wiki/Modular_multiplicative_inverse
// Solve for the smallest positive `x` in the equation `a * x ≡ 1 (mod m)`,
// or in other words, `a * x % m = 1`
// Taken from https://stackoverflow.com/a/51562038
// Only used with numbers smaller than 2^32 so doesn't need BigInt
export function modInverse(a: number, m: number) {
    a = nonNegativeMod(a, m);
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
    /* istanbul ignore next */
    if (a !== 1) {
        return NaN; // inverse does not exists
    }
    // find the inverse
    let x = 1;
    let y = 0;
    for (let i = s.length - 2; i >= 0; i -= 1) {
        [x, y] = [y, x - y * Math.floor(s[i]!.a / s[i]!.b)];
    }
    return nonNegativeMod(y, m);
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
    modulus: bigint,
): bigint {
    if (modulus === 1n) {
        return 0n;
    }

    let r = 1n;
    base = base % modulus;

    while (exponent > 0n) {
        if (BigInt.asUintN(1, exponent) === 1n) {
            r = (r * base) % modulus;
        }

        base = (base * base) % modulus;
        exponent >>= 1n;
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

// Standard `RSASSA-PKCS1-v1_5` algorithm will hash the given data
// and sign the hash
// https://datatracker.ietf.org/doc/html/rfc8017#section-8.2
//
// But ADB authentication passes 20 bytes of random value to
// OpenSSL's `RSA_sign` method which treat the input as a hash
// https://docs.openssl.org/1.0.2/man3/RSA_sign/
//
// Since it's non-standard and not supported by Web Crypto API,
// we need to implement the signing by ourself
export function rsaSign(
    privateKey: SimpleRsaPrivateKey,
    data: Uint8Array,
): Uint8Array<ArrayBuffer> {
    if (data.length !== SHA1_DIGEST_LENGTH) {
        throw new Error(
            `rsaSign expects ${SHA1_DIGEST_LENGTH} bytes (SHA-1 digest length) of data but got ${data.length} bytes`,
        );
    }

    const { n, d } = privateKey;

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
    const signature = powMod(getBigUint(padded, 0, padded.length), d, n);

    // `padded` is not used anymore,
    // re-use the buffer to store the result
    setBigUint(padded, 0, padded.length, signature, false);

    return padded;
}
