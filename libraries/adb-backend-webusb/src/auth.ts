import { AdbCredentialStore, decodeBase64, encodeBase64 } from "@yume-chan/adb";
import { decodeUtf8 } from "./utils";

export class AdbWebCredentialStore implements AdbCredentialStore {
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

        const privateKey = await crypto.subtle.exportKey('pkcs8', cryptoKey);
        window.localStorage.setItem(this.localStorageKey, decodeUtf8(encodeBase64(privateKey)));
        return privateKey;
    }

}
