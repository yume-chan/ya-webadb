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
        while (value > 0n) {
            setInt64LittleEndian(array, byteOffset, value);
            byteOffset += 8;
            value >>= 64n;
        }
    } else {
        let position = byteOffset + length - 8;
        while (value > 0n) {
            setInt64BigEndian(array, position, value);
            position -= 8;
            value >>= 64n;
        }
    }
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

export function rsaParsePrivateKey(key: Uint8Array): [n: bigint, d: bigint] {
    const n = getBigUint(key, RsaPrivateKeyNOffset, RsaPrivateKeyNLength);
    const d = getBigUint(key, RsaPrivateKeyDOffset, RsaPrivateKeyDLength);
    return [n, d];
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

const ModulusLengthInBytes = 2048 / 8;
const ModulusLengthInWords = ModulusLengthInBytes / 4;

export function adbGetPublicKeySize() {
    return 4 + 4 + ModulusLengthInBytes + ModulusLengthInBytes + 4;
}

export function adbGeneratePublicKey(
    privateKey: Uint8Array,
): Uint8Array<ArrayBuffer>;
export function adbGeneratePublicKey(
    privateKey: Uint8Array,
    output: Uint8Array,
): number;
export function adbGeneratePublicKey(
    privateKey: Uint8Array,
    output?: Uint8Array,
): Uint8Array | number {
    // cspell: ignore: mincrypt
    // Android 6 and earlier has its own encryption library called mincrypt
    // This is the RSA public key format used by mincrypt:
    // https://android.googlesource.com/platform/system/core/+/bb0c180e62703c2068a1b2c9f8ba6d634bf1553c/include/mincrypt/rsa.h#46
    // `n0inv` and `rr` are pre-calculated to speed up RSA operations

    // Android 7 switched its encryption library to BoringSSL, but still keeps the key format:
    // https://android.googlesource.com/platform/system/core.git/+/91784040db2b9273687f88d8b95f729d4a61ecc2/libcrypto_utils/android_pubkey.cpp#38
    // Except when reading a key, `n0inv` and `rr` are ignored (they are still populated when generating a key):
    // https://android.googlesource.com/platform/system/core.git/+/91784040db2b9273687f88d8b95f729d4a61ecc2/libcrypto_utils/android_pubkey.cpp#55

    // The public key is a struct (in little endian) of:
    //
    // [
    //   modulusLengthInWords, // 32-bit integer, a "word" is 32-bit so it must be 2048 / 8 / 4
    //                         // (the comment in Android source code is incorrect saying "This must be ANDROID_PUBKEY_MODULUS_SIZE")
    //   n0inv,                // 32-bit integer, the modular inverse of (lower 32 bits of `n`)
    //   modulus,              // `n`
    //   rr,                   // Montgomery parameter R^2
    //   exponent,             // 32-bit integer, must be 3 or 65537
    // ]

    let outputType: "Uint8Array" | "number";
    const outputLength = adbGetPublicKeySize();
    if (!output) {
        output = new Uint8Array(outputLength);
        outputType = "Uint8Array";
    } else {
        if (output.length < outputLength) {
            throw new TypeError("output buffer is too small");
        }

        outputType = "number";
    }

    const outputView = new DataView(
        output.buffer,
        output.byteOffset,
        output.length,
    );
    let outputOffset = 0;

    // modulusLengthInWords
    outputView.setUint32(outputOffset, ModulusLengthInWords, true);
    outputOffset += 4;

    // extract `n` from private key
    const [n] = rsaParsePrivateKey(privateKey);

    // Calculate `n0inv`
    const n0inv = -modInverse(Number(n % 2n ** 32n), 2 ** 32);
    outputView.setInt32(outputOffset, n0inv, true);
    outputOffset += 4;

    // Write `n` (a.k.a. `modulus`)
    setBigUint(output, outputOffset, ModulusLengthInBytes, n, true);
    outputOffset += ModulusLengthInBytes;

    // Calculate rr = (2 ** (rsa_size)) ** 2 % n
    const rr = 2n ** 4096n % n;
    setBigUint(output, outputOffset, ModulusLengthInBytes, rr, true);
    outputOffset += ModulusLengthInBytes;

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

// SubtleCrypto.sign() will hash the given data and sign the hash
// But we don't need the hashing step
// (In another word, ADB just requires the client to
// encrypt the given data with its private key)
// However SubtileCrypto.encrypt() doesn't accept 'RSASSA-PKCS1-v1_5' algorithm
// So we need to implement the encryption by ourself
export function rsaSign(
    privateKey: Uint8Array,
    data: Uint8Array,
): Uint8Array<ArrayBuffer> {
    const [n, d] = rsaParsePrivateKey(privateKey);

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
