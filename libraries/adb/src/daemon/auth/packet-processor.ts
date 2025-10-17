import type { MaybePromiseLike } from "@yume-chan/async";
import { EmptyUint8Array, encodeUtf8 } from "@yume-chan/struct";

import {
    calculateBase64EncodedLength,
    encodeBase64,
} from "../../utils/base64.js";
import { rsaSign } from "../crypto.js";
import type { AdbPacketData } from "../packet.js";
import { AdbCommand } from "../packet.js";

import type { IAdbDaemonAuthProcessor } from "./authenticator.js";
import {
    adbGeneratePublicKey,
    adbGetPublicKeyFingerprint,
    adbGetPublicKeySize,
} from "./public-key.js";
import type { AdbPrivateKey } from "./type.js";

export type MaybeError<T> = T | Error;

export type AdbKeyIterable =
    | Iterable<MaybeError<AdbPrivateKey>>
    | AsyncIterable<MaybeError<AdbPrivateKey>>;

export interface AdbCredentialManager {
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

export interface AdbKeyInfo {
    fingerprint: string;
    name: string | undefined;
}

export const AdbDaemonAuthType = {
    Token: 1,
    Signature: 2,
    PublicKey: 3,
} as const;

export type AdbDaemonAuthType =
    (typeof AdbDaemonAuthType)[keyof typeof AdbDaemonAuthType];

export interface AdbDaemonAuthProcessorInit {
    credentialManager: AdbCredentialManager;
    onKeyLoadError?: ((error: Error) => void) | undefined;
    onSignatureAuthentication?: ((key: AdbKeyInfo) => void) | undefined;
    onSignatureRejected?: ((key: AdbKeyInfo) => void) | undefined;
    onPublicKeyAuthentication?: ((key: AdbKeyInfo) => void) | undefined;
}

export class AdbDaemonAuthProcessor implements IAdbDaemonAuthProcessor {
    #credentialManager: AdbCredentialManager;
    #onKeyLoadError: ((error: Error) => void) | undefined;
    #onSignatureAuthentication: ((key: AdbKeyInfo) => void) | undefined;
    #onSignatureRejected: ((key: AdbKeyInfo) => void) | undefined;
    #onPublicKeyAuthentication: ((key: AdbKeyInfo) => void) | undefined;

    #iterator:
        | Iterator<MaybeError<AdbPrivateKey>, void, void>
        | AsyncIterator<MaybeError<AdbPrivateKey>, void, void>
        | undefined;

    #prevKeyInfo: AdbKeyInfo | undefined;
    #firstKey: AdbPrivateKey | undefined;

    constructor(init: AdbDaemonAuthProcessorInit) {
        this.#credentialManager = init.credentialManager;
        this.#onKeyLoadError = init.onKeyLoadError;
        this.#onSignatureAuthentication = init.onSignatureAuthentication;
        this.#onSignatureRejected = init.onSignatureRejected;
        this.#onPublicKeyAuthentication = init.onPublicKeyAuthentication;
    }

    /**
     * Gets the next available private key.
     * @returns The next available private key, or `undefined` if no more key is available
     */
    async #getNextKey() {
        if (!this.#iterator) {
            const iterable = this.#credentialManager.iterateKeys();
            if (Symbol.iterator in iterable) {
                this.#iterator = iterable[Symbol.iterator]();
            } else if (Symbol.asyncIterator in iterable) {
                this.#iterator = iterable[Symbol.asyncIterator]();
            } else {
                throw new Error("`iterateKeys` doesn't return an iterator");
            }
        }

        while (true) {
            const { done, value } = await this.#iterator.next();
            if (done) {
                return undefined;
            }

            if (value instanceof Error) {
                // Report the error, then continue calling `next`
                this.#onKeyLoadError?.(value);
                continue;
            }

            return value;
        }
    }

    /**
     * Tries to sign the challenge using the next private key.
     *
     * @param challenge The data to sign
     * @returns An `AdbPacket` containing the response, or `undefined` if no key is available
     */
    async #sign(challenge: Uint8Array): Promise<AdbPacketData | undefined> {
        const key = await this.#getNextKey();
        if (!key) {
            return undefined;
        }

        if (!this.#firstKey) {
            this.#firstKey = key;
        }

        // A new challenge implies the previous signature was rejected.
        if (this.#prevKeyInfo) {
            this.#onSignatureRejected?.(this.#prevKeyInfo);
        }

        const fingerprint = adbGetPublicKeyFingerprint(key);
        this.#prevKeyInfo = { fingerprint, name: key.name };
        this.#onSignatureAuthentication?.(this.#prevKeyInfo);

        return {
            command: AdbCommand.Auth,
            arg0: AdbDaemonAuthType.Signature,
            arg1: 0,
            payload: rsaSign(key, challenge),
        };
    }

    async process(packet: AdbPacketData): Promise<AdbPacketData> {
        if (packet.arg0 !== AdbDaemonAuthType.Token) {
            throw new Error("Unsupported authentication packet");
        }

        const signature = await this.#sign(packet.payload);
        if (signature) {
            return signature;
        }

        let key = this.#firstKey;
        if (!key) {
            key = await this.#credentialManager.generateKey();
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

        this.#onPublicKeyAuthentication?.({
            fingerprint: adbGetPublicKeyFingerprint(
                publicKeyBuffer.subarray(0, publicKeyLength),
            ),
            name: key.name,
        });

        return {
            command: AdbCommand.Auth,
            arg0: AdbDaemonAuthType.PublicKey,
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
