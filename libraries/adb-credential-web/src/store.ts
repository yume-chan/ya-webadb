import { rsaParsePrivateKey } from "@yume-chan/adb";
import type { AdbCredentialStore, AdbPrivateKey } from "@yume-chan/adb";

import type { TangoDataStorage } from "./storage/index.js";

export class AdbWebCryptoCredentialStore implements AdbCredentialStore {
    readonly #storage: TangoDataStorage;

    readonly #appName: string;

    constructor(storage: TangoDataStorage, appName: string = "Tango") {
        this.#storage = storage;
        this.#appName = appName;
    }

    async generateKey(): Promise<AdbPrivateKey> {
        // NOTE: ADB public key authentication doesn't use standard
        // RSASSA-PKCS1-v1_5 algorithm to sign and verify data.
        // We implemented ADB public key authentication ourselves in core package,
        // so some parameters for Web Crypto API are not used.

        const { privateKey: cryptoKey } = await crypto.subtle.generateKey(
            {
                name: "RSASSA-PKCS1-v1_5",
                modulusLength: 2048,
                // 65537
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                // Not used
                hash: "SHA-1",
            },
            true,
            // Not used
            ["sign"],
        );

        const privateKey = new Uint8Array(
            await crypto.subtle.exportKey("pkcs8", cryptoKey),
        );

        await this.#storage.save(privateKey);

        return {
            ...rsaParsePrivateKey(privateKey),
            name: `${this.#appName}@${globalThis.location.hostname}`,
        };
    }

    async *iterateKeys(): AsyncGenerator<AdbPrivateKey, void, void> {
        for await (const privateKey of this.#storage.load()) {
            yield {
                ...rsaParsePrivateKey(privateKey),
                name: `${this.#appName}@${globalThis.location.hostname}`,
            };
        }
    }
}
