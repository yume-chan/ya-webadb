import type {
    AdbCredentialManager,
    AdbDaemonDefaultAuthenticationProcessorInit,
    AdbPrivateKey,
    MaybeError,
} from "@yume-chan/adb";
import {
    AdbDaemonDefaultAuthenticationProcessor,
    AdbDaemonDefaultAuthenticator,
    rsaParsePrivateKey,
} from "@yume-chan/adb";

import type { TangoKeyStorage } from "./storage/index.js";

export class AdbWebCryptoCredentialManager implements AdbCredentialManager {
    static createDefaultAuthenticationProcessor(
        storage: TangoKeyStorage,
        init?: Omit<
            AdbDaemonDefaultAuthenticationProcessorInit,
            "credentialStore"
        > & {
            name?: string;
        },
    ) {
        return new AdbDaemonDefaultAuthenticationProcessor({
            ...init,
            credentialManager: new this(storage, init?.name),
        });
    }

    static createDefaultAuthenticator(
        storage: TangoKeyStorage,
        init?: Omit<
            AdbDaemonDefaultAuthenticationProcessorInit,
            "credentialStore"
        > & {
            name?: string;
        },
    ) {
        return new AdbDaemonDefaultAuthenticator(() =>
            this.createDefaultAuthenticationProcessor(storage, init),
        );
    }

    readonly #storage: TangoKeyStorage;

    readonly #name: string | undefined;

    constructor(storage: TangoKeyStorage, name?: string) {
        this.#storage = storage;
        this.#name = name;
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

        const parsed = rsaParsePrivateKey(privateKey);

        await this.#storage.save(privateKey, this.#name);

        // Clear secret memory
        //   * `privateKey` is not allowed to be used after `save`
        privateKey.fill(0);

        return {
            ...parsed,
            name: this.#name,
        };
    }

    async *iterateKeys(): AsyncGenerator<
        MaybeError<AdbPrivateKey>,
        void,
        void
    > {
        for await (const result of this.#storage.load()) {
            if (result instanceof Error) {
                yield result;
                continue;
            }

            try {
                // `privateKey` is owned by `#storage` and will be cleared by it
                yield {
                    ...rsaParsePrivateKey(result.privateKey),
                    name: result.name ?? this.#name,
                };
            } catch (e) {
                yield e instanceof Error
                    ? e
                    : new Error(String(e), { cause: e });
            }
        }
    }
}
