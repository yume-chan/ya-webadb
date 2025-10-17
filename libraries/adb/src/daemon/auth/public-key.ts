import { md5Digest } from "../../utils/md5.js";
import type { SimpleRsaPrivateKey } from "../crypto.js";
import { modInverse, setBigUint } from "../crypto.js";

import type { AdbPrivateKey } from "./type.js";

const ModulusLengthInBytes = 2048 / 8;
const ModulusLengthInWords = ModulusLengthInBytes / 4;

export function adbGetPublicKeySize() {
    return 4 + 4 + ModulusLengthInBytes + ModulusLengthInBytes + 4;
}

export function adbGeneratePublicKey(
    privateKey: SimpleRsaPrivateKey,
): Uint8Array<ArrayBuffer>;
export function adbGeneratePublicKey(
    privateKey: SimpleRsaPrivateKey,
    output: Uint8Array,
): number;
export function adbGeneratePublicKey(
    privateKey: SimpleRsaPrivateKey,
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
    const { n } = privateKey;

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

// https://cs.android.com/android/platform/superproject/main/+/main:frameworks/base/services/core/java/com/android/server/adb/AdbDebuggingManager.java;l=1419;drc=61197364367c9e404c7da6900658f1b16c42d0da
export function adbGetPublicKeyFingerprint(privateKey: AdbPrivateKey): string;
export function adbGetPublicKeyFingerprint(publicKey: Uint8Array): string;
export function adbGetPublicKeyFingerprint(
    key: AdbPrivateKey | Uint8Array,
): string {
    if ("d" in key) {
        key = adbGeneratePublicKey(key);
    }

    const md5 = md5Digest(key);
    return Array.from(md5, (byte) => byte.toString(16).padStart(2, "0")).join(
        ":",
    );
}
