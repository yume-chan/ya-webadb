import type { MaybePromiseLike } from "@yume-chan/async";
import { EventEmitter } from "@yume-chan/event";
import { EmptyUint8Array } from "@yume-chan/struct";

import {
    calculateBase64EncodedLength,
    encodeBase64,
    encodeUtf8,
} from "../utils/index.js";

import type { SimpleRsaPrivateKey } from "./crypto.js";
import {
    adbGeneratePublicKey,
    adbGetPublicKeySize,
    rsaSign,
} from "./crypto.js";
import type { AdbPacketData } from "./packet.js";
import { AdbCommand } from "./packet.js";

export interface AdbPrivateKey extends SimpleRsaPrivateKey {
    name?: string | undefined;
}

export type AdbKeyIterable =
    | Iterable<AdbPrivateKey>
    | AsyncIterable<AdbPrivateKey>;

export interface AdbCredentialStore {
    /**
     * Generates and stores a RSA private key with modulus length `2048` and public exponent `65537`.
     */
    generateKey(): MaybePromiseLike<AdbPrivateKey>;

    /**
     * Synchronously or asynchronously iterates through all stored RSA private keys.
     *
     * Each call to `iterateKeys` must return a different iterator that iterate through all stored keys.
     */
    iterateKeys(): AdbKeyIterable;
}

export const AdbAuthType = {
    Token: 1,
    Signature: 2,
    PublicKey: 3,
} as const;

export type AdbAuthType = (typeof AdbAuthType)[keyof typeof AdbAuthType];

export interface AdbAuthenticator {
    authenticate(packet: AdbPacketData): Promise<AdbPacketData>;

    close?(): MaybePromiseLike<undefined>;
}

export class AdbDefaultAuthenticator implements AdbAuthenticator {
    #credentialStore: AdbCredentialStore;
    #iterator:
        | Iterator<AdbPrivateKey, void, void>
        | AsyncIterator<AdbPrivateKey, void, void>
        | undefined;
    #firstKey: AdbPrivateKey | undefined;

    #onPublicKeyAuthentication = new EventEmitter<void>();
    get onPublicKeyAuthentication() {
        return this.#onPublicKeyAuthentication.event;
    }

    constructor(credentialStore: AdbCredentialStore) {
        this.#credentialStore = credentialStore;
    }

    async authenticate(packet: AdbPacketData): Promise<AdbPacketData> {
        if (packet.arg0 !== AdbAuthType.Token) {
            throw new Error("Unsupported authentication packet");
        }

        if (!this.#iterator) {
            const iterable = this.#credentialStore.iterateKeys();
            if (Symbol.iterator in iterable) {
                this.#iterator = iterable[Symbol.iterator]();
            } else if (Symbol.asyncIterator in iterable) {
                this.#iterator = iterable[Symbol.asyncIterator]();
            } else {
                throw new Error("`iterateKeys` doesn't return an iterator");
            }
        }

        const { done, value } = await this.#iterator.next();
        if (!done) {
            if (!this.#firstKey) {
                this.#firstKey = value;
            }

            return {
                command: AdbCommand.Auth,
                arg0: AdbAuthType.Signature,
                arg1: 0,
                payload: rsaSign(value, packet.payload),
            };
        }

        this.#onPublicKeyAuthentication.fire();

        let key = this.#firstKey;
        if (!key) {
            key = await this.#credentialStore.generateKey();
        }

        const publicKeyLength = adbGetPublicKeySize();
        const [publicKeyBase64Length] =
            calculateBase64EncodedLength(publicKeyLength);

        const nameBuffer = key.name?.length
            ? encodeUtf8(key.name)
            : EmptyUint8Array;
        const publicKeyBuffer = new Uint8Array(
            publicKeyBase64Length +
                (nameBuffer.length ? nameBuffer.length + 1 : 0) + // Space character + name
                1, // Null character
        );

        adbGeneratePublicKey(key, publicKeyBuffer);
        encodeBase64(
            publicKeyBuffer.subarray(0, publicKeyLength),
            publicKeyBuffer,
        );

        if (nameBuffer.length) {
            publicKeyBuffer[publicKeyBase64Length] = 0x20;
            publicKeyBuffer.set(nameBuffer, publicKeyBase64Length + 1);
        }

        return {
            command: AdbCommand.Auth,
            arg0: AdbAuthType.PublicKey,
            arg1: 0,
            payload: publicKeyBuffer,
        };
    }

    async close(): Promise<undefined> {
        await this.#iterator?.return?.();

        this.#iterator = undefined;
        this.#firstKey = undefined;
    }
}
