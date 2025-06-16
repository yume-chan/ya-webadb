import type { MaybePromiseLike } from "@yume-chan/async";
import { PromiseResolver } from "@yume-chan/async";
import type { Disposable } from "@yume-chan/event";
import { EmptyUint8Array } from "@yume-chan/struct";

import {
    calculateBase64EncodedLength,
    encodeBase64,
    encodeUtf8,
} from "../utils/index.js";

import {
    adbGeneratePublicKey,
    adbGetPublicKeySize,
    rsaSign,
} from "./crypto.js";
import type { AdbPacketData } from "./packet.js";
import { AdbCommand } from "./packet.js";

export interface AdbPrivateKey {
    /**
     * The private key in PKCS #8 format.
     */
    buffer: Uint8Array;
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
    /**
     * @param getNextRequest
     *
     * Call this function to get the next authentication request packet from device.
     *
     * After calling `getNextRequest`, authenticator can `yield` a packet as response, or `return` to indicate its incapability of handling the request.
     *
     * After `return`, the `AdbAuthenticatorHandler` will move on to next authenticator and never go back.
     *
     * Calling `getNextRequest` multiple times without `yield` or `return` will always return the same request.
     */
    (
        credentialStore: AdbCredentialStore,
        getNextRequest: () => Promise<AdbPacketData>,
    ): AsyncIterable<AdbPacketData>;
}

export const AdbSignatureAuthenticator: AdbAuthenticator = async function* (
    credentialStore: AdbCredentialStore,
    getNextRequest: () => Promise<AdbPacketData>,
): AsyncIterable<AdbPacketData> {
    for await (const key of credentialStore.iterateKeys()) {
        const packet = await getNextRequest();

        if (packet.arg0 !== AdbAuthType.Token) {
            return;
        }

        const signature = rsaSign(key.buffer, packet.payload);
        yield {
            command: AdbCommand.Auth,
            arg0: AdbAuthType.Signature,
            arg1: 0,
            payload: signature,
        };
    }
};

export const AdbPublicKeyAuthenticator: AdbAuthenticator = async function* (
    credentialStore: AdbCredentialStore,
    getNextRequest: () => Promise<AdbPacketData>,
): AsyncIterable<AdbPacketData> {
    const packet = await getNextRequest();

    if (packet.arg0 !== AdbAuthType.Token) {
        return;
    }

    let privateKey: AdbPrivateKey | undefined;
    for await (const key of credentialStore.iterateKeys()) {
        privateKey = key;
        break;
    }

    if (!privateKey) {
        privateKey = await credentialStore.generateKey();
    }

    const publicKeyLength = adbGetPublicKeySize();
    const [publicKeyBase64Length] =
        calculateBase64EncodedLength(publicKeyLength);

    const nameBuffer = privateKey.name?.length
        ? encodeUtf8(privateKey.name)
        : EmptyUint8Array;
    const publicKeyBuffer = new Uint8Array(
        publicKeyBase64Length +
            (nameBuffer.length ? nameBuffer.length + 1 : 0) + // Space character + name
            1, // Null character
    );

    adbGeneratePublicKey(privateKey.buffer, publicKeyBuffer);
    encodeBase64(publicKeyBuffer.subarray(0, publicKeyLength), publicKeyBuffer);

    if (nameBuffer.length) {
        publicKeyBuffer[publicKeyBase64Length] = 0x20;
        publicKeyBuffer.set(nameBuffer, publicKeyBase64Length + 1);
    }

    yield {
        command: AdbCommand.Auth,
        arg0: AdbAuthType.PublicKey,
        arg1: 0,
        payload: publicKeyBuffer,
    };
};

export const ADB_DEFAULT_AUTHENTICATORS: readonly AdbAuthenticator[] = [
    AdbSignatureAuthenticator,
    AdbPublicKeyAuthenticator,
];

export class AdbAuthenticationProcessor implements Disposable {
    readonly authenticators: readonly AdbAuthenticator[];

    readonly #credentialStore: AdbCredentialStore;

    #pendingRequest = new PromiseResolver<AdbPacketData>();
    #iterator: AsyncIterator<AdbPacketData, void, void> | undefined;

    constructor(
        authenticators: readonly AdbAuthenticator[],
        credentialStore: AdbCredentialStore,
    ) {
        this.authenticators = authenticators;
        this.#credentialStore = credentialStore;
    }

    #getNextRequest = (): Promise<AdbPacketData> => {
        return this.#pendingRequest.promise;
    };

    async *#invokeAuthenticator(): AsyncGenerator<AdbPacketData, void, void> {
        for (const authenticator of this.authenticators) {
            for await (const packet of authenticator(
                this.#credentialStore,
                this.#getNextRequest,
            )) {
                // If the authenticator yielded a response
                // Prepare `nextRequest` for next authentication request
                this.#pendingRequest = new PromiseResolver();

                // Yield the response to outer layer
                yield packet;
            }

            // If the authenticator returned,
            // Next authenticator will be given the same `pendingRequest`
        }
    }

    async process(packet: AdbPacketData): Promise<AdbPacketData> {
        if (!this.#iterator) {
            this.#iterator = this.#invokeAuthenticator();
        }

        this.#pendingRequest.resolve(packet);

        const result = await this.#iterator.next();
        if (result.done) {
            throw new Error("No authenticator can handle the request");
        }

        return result.value;
    }

    dispose() {
        void this.#iterator?.return?.();
    }
}
