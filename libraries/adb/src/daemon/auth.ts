import type { MaybePromiseLike } from "@yume-chan/async";
import { EventEmitter } from "@yume-chan/event";
import { EmptyUint8Array } from "@yume-chan/struct";

import {
    calculateBase64EncodedLength,
    encodeBase64,
    encodeUtf8,
    md5Digest,
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

export type MaybeError<T> = T | Error;

export type AdbKeyIterable =
    | Iterable<MaybeError<AdbPrivateKey>>
    | AsyncIterable<MaybeError<AdbPrivateKey>>;

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

// https://cs.android.com/android/platform/superproject/main/+/main:frameworks/base/services/core/java/com/android/server/adb/AdbDebuggingManager.java;l=1419;drc=61197364367c9e404c7da6900658f1b16c42d0da
function getFingerprint(key: AdbPrivateKey) {
    const publicKey = adbGeneratePublicKey(key);
    const md5 = md5Digest(publicKey);
    return Array.from(md5, (byte) => byte.toString(16).padStart(2, "0")).join(
        ":",
    );
}

export interface AdbKeyInfo {
    fingerprint: string;
    name: string | undefined;
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
        | Iterator<MaybeError<AdbPrivateKey>, void, void>
        | AsyncIterator<MaybeError<AdbPrivateKey>, void, void>
        | undefined;

    #prevFingerprint: string | undefined;
    #firstKey: AdbPrivateKey | undefined;

    #onKeyLoadError = new EventEmitter<Error>();
    get onKeyLoadError() {
        return this.#onKeyLoadError.event;
    }

    #onSignatureAuthentication = new EventEmitter<AdbKeyInfo>();
    get onSignatureAuthentication() {
        return this.#onSignatureAuthentication.event;
    }

    #onSignatureRejected = new EventEmitter<AdbKeyInfo>();
    get onSignatureRejected() {
        return this.#onSignatureRejected.event;
    }

    #onPublicKeyAuthentication = new EventEmitter<AdbKeyInfo>();
    get onPublicKeyAuthentication() {
        return this.#onPublicKeyAuthentication.event;
    }

    constructor(credentialStore: AdbCredentialStore) {
        this.#credentialStore = credentialStore;
    }

    async #iterate(token: Uint8Array): Promise<AdbPacketData | undefined> {
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

        const { done, value: result } = await this.#iterator.next();
        if (done) {
            return undefined;
        }

        if (result instanceof Error) {
            this.#onKeyLoadError.fire(result);
            return await this.#iterate(token);
        }

        if (!this.#firstKey) {
            this.#firstKey = result;
        }

        if (this.#prevFingerprint) {
            this.#onSignatureRejected.fire({
                fingerprint: this.#prevFingerprint,
                name: result.name,
            });
        }

        const fingerprint = getFingerprint(result);
        this.#prevFingerprint = fingerprint;
        this.#onSignatureAuthentication.fire({
            fingerprint,
            name: result.name,
        });

        return {
            command: AdbCommand.Auth,
            arg0: AdbAuthType.Signature,
            arg1: 0,
            payload: rsaSign(result, token),
        };
    }

    async authenticate(packet: AdbPacketData): Promise<AdbPacketData> {
        if (packet.arg0 !== AdbAuthType.Token) {
            throw new Error("Unsupported authentication packet");
        }

        const signature = await this.#iterate(packet.payload);
        if (signature) {
            return signature;
        }

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

        this.#onPublicKeyAuthentication.fire({
            fingerprint: getFingerprint(key),
            name: key.name,
        });

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
