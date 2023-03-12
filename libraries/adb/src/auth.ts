import { PromiseResolver } from "@yume-chan/async";
import type { Disposable } from "@yume-chan/event";
import type { ValueOrPromise } from "@yume-chan/struct";

import {
    calculatePublicKey,
    calculatePublicKeyLength,
    sign,
} from "./crypto.js";
import type { AdbPacketData } from "./packet.js";
import { AdbCommand } from "./packet.js";
import { calculateBase64EncodedLength, encodeBase64 } from "./utils/index.js";

export type AdbKeyIterable = Iterable<Uint8Array> | AsyncIterable<Uint8Array>;

export interface AdbCredentialStore {
    /**
     * Generate and store a RSA private key with modulus length `2048` and public exponent `65537`.
     *
     * The returned `Uint8Array` is the private key in PKCS #8 format.
     */
    generateKey(): ValueOrPromise<Uint8Array>;

    /**
     * Synchronously or asynchronously iterate through all stored RSA private keys.
     *
     * Each call to `iterateKeys` must return a different iterator that iterate through all stored keys.
     */
    iterateKeys(): AdbKeyIterable;
}

export enum AdbAuthType {
    Token = 1,
    Signature = 2,
    PublicKey = 3,
}

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
        getNextRequest: () => Promise<AdbPacketData>
    ): AsyncIterable<AdbPacketData>;
}

export const AdbSignatureAuthenticator: AdbAuthenticator = async function* (
    credentialStore: AdbCredentialStore,
    getNextRequest: () => Promise<AdbPacketData>
): AsyncIterable<AdbPacketData> {
    for await (const key of credentialStore.iterateKeys()) {
        const packet = await getNextRequest();

        if (packet.arg0 !== AdbAuthType.Token) {
            return;
        }

        const signature = sign(key, packet.payload);
        yield {
            command: AdbCommand.Auth,
            arg0: AdbAuthType.Signature,
            arg1: 0,
            payload: new Uint8Array(signature),
        };
    }
};

export const AdbPublicKeyAuthenticator: AdbAuthenticator = async function* (
    credentialStore: AdbCredentialStore,
    getNextRequest: () => Promise<AdbPacketData>
): AsyncIterable<AdbPacketData> {
    const packet = await getNextRequest();

    if (packet.arg0 !== AdbAuthType.Token) {
        return;
    }

    let privateKey: Uint8Array | undefined;
    for await (const key of credentialStore.iterateKeys()) {
        privateKey = key;
        break;
    }

    if (!privateKey) {
        privateKey = await credentialStore.generateKey();
    }

    const publicKeyLength = calculatePublicKeyLength();
    const [publicKeyBase64Length] =
        calculateBase64EncodedLength(publicKeyLength);

    const publicKeyBuffer = new Uint8Array(
        publicKeyBase64Length + 1 // Null character
    );

    calculatePublicKey(privateKey, publicKeyBuffer);
    encodeBase64(publicKeyBuffer.subarray(0, publicKeyLength), publicKeyBuffer);

    yield {
        command: AdbCommand.Auth,
        arg0: AdbAuthType.PublicKey,
        arg1: 0,
        payload: publicKeyBuffer,
    };
};

export const ADB_DEFAULT_AUTHENTICATORS: AdbAuthenticator[] = [
    AdbSignatureAuthenticator,
    AdbPublicKeyAuthenticator,
];

export class AdbAuthenticationProcessor implements Disposable {
    public readonly authenticators: readonly AdbAuthenticator[];

    private readonly credentialStore: AdbCredentialStore;

    private pendingRequest = new PromiseResolver<AdbPacketData>();

    private iterator: AsyncIterator<AdbPacketData, void, void> | undefined;

    public constructor(
        authenticators: readonly AdbAuthenticator[],
        credentialStore: AdbCredentialStore
    ) {
        this.authenticators = authenticators;
        this.credentialStore = credentialStore;
    }

    private getNextRequest = (): Promise<AdbPacketData> => {
        return this.pendingRequest.promise;
    };

    private async *invokeAuthenticator(): AsyncGenerator<
        AdbPacketData,
        void,
        void
    > {
        for (const authenticator of this.authenticators) {
            for await (const packet of authenticator(
                this.credentialStore,
                this.getNextRequest
            )) {
                // If the authenticator yielded a response
                // Prepare `nextRequest` for next authentication request
                this.pendingRequest = new PromiseResolver();

                // Yield the response to outer layer
                yield packet;
            }

            // If the authenticator returned,
            // Next authenticator will be given the same `pendingRequest`
        }
    }

    public async process(packet: AdbPacketData): Promise<AdbPacketData> {
        if (!this.iterator) {
            this.iterator = this.invokeAuthenticator();
        }

        this.pendingRequest.resolve(packet);

        const result = await this.iterator.next();
        if (result.done) {
            throw new Error("No authenticator can handle the request");
        }

        return result.value;
    }

    public dispose() {
        void this.iterator?.return?.();
    }
}
