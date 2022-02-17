// cspell: ignore RSASSA

import { type AdbCredentialStore, calculateBase64EncodedLength, calculatePublicKey, calculatePublicKeyLength, decodeBase64, encodeBase64 } from "@yume-chan/adb";

const Utf8Encoder = new TextEncoder();
const Utf8Decoder = new TextDecoder();

export function encodeUtf8(input: string): ArrayBuffer {
    return Utf8Encoder.encode(input).buffer;
}

export function decodeUtf8(buffer: ArrayBuffer): string {
    return Utf8Decoder.decode(buffer);
}

export default class AdbWebCredentialStore implements AdbCredentialStore {
    public readonly localStorageKey: string;

    public constructor(localStorageKey = 'private-key') {
        this.localStorageKey = localStorageKey;
    }

    public *iterateKeys(): Generator<ArrayBuffer, void, void> {
        const privateKey = window.localStorage.getItem(this.localStorageKey);
        if (privateKey) {
            yield decodeBase64(privateKey);
        }
    }

    public async generateKey(): Promise<ArrayBuffer> {
        const { privateKey: cryptoKey } = await crypto.subtle.generateKey(
            {
                name: 'RSASSA-PKCS1-v1_5',
                modulusLength: 2048,
                // 65537
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: 'SHA-1',
            },
            true,
            ['sign', 'verify']
        );

        const privateKey = await crypto.subtle.exportKey('pkcs8', cryptoKey!);
        window.localStorage.setItem(this.localStorageKey, decodeUtf8(encodeBase64(privateKey)));

        // The authentication module in core doesn't need public keys.
        // It will generate the public key from private key every time.
        // However, maybe there are people want to manually put this public key onto their device,
        // so also save the public key for their convenience.
        const publicKeyLength = calculatePublicKeyLength();
        const [publicKeyBase64Length] = calculateBase64EncodedLength(publicKeyLength);
        const publicKeyBuffer = new ArrayBuffer(publicKeyBase64Length);
        calculatePublicKey(privateKey, publicKeyBuffer);
        encodeBase64(publicKeyBuffer, 0, publicKeyLength, publicKeyBuffer);
        window.localStorage.setItem(this.localStorageKey + '.pub', decodeUtf8(publicKeyBuffer));

        return privateKey;
    }
}
