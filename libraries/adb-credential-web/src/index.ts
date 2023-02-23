// cspell: ignore RSASSA

import type { AdbCredentialStore } from "@yume-chan/adb";
import {
    calculateBase64EncodedLength,
    calculatePublicKey,
    calculatePublicKeyLength,
    decodeBase64,
    decodeUtf8,
    encodeBase64,
} from "@yume-chan/adb";

export default class AdbWebCredentialStore implements AdbCredentialStore {
    public readonly localStorageKey: string;

    /**
     * Create a new instance of `AdbWebCredentialStore`.
     *
     * @param localStorageKey Specifies the key to use when reading and writing the private key in LocalStorage.
     */
    public constructor(localStorageKey = "private-key") {
        this.localStorageKey = localStorageKey;
    }

    /**
     * Generate a RSA private key and store it into LocalStorage.
     *
     * Calling this method multiple times will overwrite the previous key.
     *
     * @returns The private key in PKCS #8 format.
     */
    public async generateKey(): Promise<Uint8Array> {
        const { privateKey: cryptoKey } = await crypto.subtle.generateKey(
            {
                name: "RSASSA-PKCS1-v1_5",
                modulusLength: 2048,
                // 65537
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: "SHA-1",
            },
            true,
            ["sign", "verify"]
        );

        const privateKey = new Uint8Array(
            await crypto.subtle.exportKey("pkcs8", cryptoKey)
        );
        window.localStorage.setItem(
            this.localStorageKey,
            decodeUtf8(encodeBase64(privateKey))
        );

        // The authentication module in core doesn't need public keys.
        // It will generate the public key from private key every time.
        // However, maybe there are people want to manually put this public key onto their device,
        // so also save the public key for their convenience.
        const publicKeyLength = calculatePublicKeyLength();
        const [publicKeyBase64Length] =
            calculateBase64EncodedLength(publicKeyLength);
        const publicKeyBuffer = new Uint8Array(publicKeyBase64Length);
        calculatePublicKey(privateKey, publicKeyBuffer);
        encodeBase64(
            publicKeyBuffer.subarray(0, publicKeyLength),
            publicKeyBuffer
        );
        window.localStorage.setItem(
            this.localStorageKey + ".pub",
            decodeUtf8(publicKeyBuffer)
        );

        return privateKey;
    }

    /**
     * Yield the stored RSA private key. `AdbWebCredentialStore` only stores one key, so only one value will be yielded.
     *
     * This method returns a generator, so `for...of...` loop should be used to read the key.
     */
    public *iterateKeys(): Generator<Uint8Array, void, void> {
        const privateKey = window.localStorage.getItem(this.localStorageKey);
        if (privateKey) {
            yield decodeBase64(privateKey);
        }
    }
}
