import { PromiseResolver } from '@yume-chan/async';
import { Disposable } from '@yume-chan/event';
import { ValueOrPromise } from '@yume-chan/struct';
import { calculatePublicKey, calculatePublicKeyLength, sign } from './crypto';
import { AdbCommand, AdbPacket, AdbPacketInit } from './packet';
import { calculateBase64EncodedLength, encodeBase64 } from './utils';

export type AdbKeyIterable = Iterable<ArrayBuffer> | AsyncIterable<ArrayBuffer>;

export interface AdbCredentialStore {
    /**
     * Generate and store a RSA private key with modulus length `2048` and public exponent `65537`.
     *
     * The returned `ArrayBuffer` is the private key in PKCS #8 format.
     */
    generateKey(): ValueOrPromise<ArrayBuffer>;

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
        getNextRequest: () => Promise<AdbPacket>
    ): AsyncIterable<AdbPacketInit>;
}

export const AdbSignatureAuthenticator: AdbAuthenticator = async function* (
    credentialStore: AdbCredentialStore,
    getNextRequest: () => Promise<AdbPacket>,
): AsyncIterable<AdbPacketInit> {
    for await (const key of credentialStore.iterateKeys()) {
        const packet = await getNextRequest();

        if (packet.arg0 !== AdbAuthType.Token) {
            return;
        }

        const signature = sign(key, packet.payload!);
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
    getNextRequest: () => Promise<AdbPacket>,
): AsyncIterable<AdbPacketInit> {
    const packet = await getNextRequest();

    if (packet.arg0 !== AdbAuthType.Token) {
        return;
    }

    let privateKey: ArrayBuffer | undefined;
    for await (const key of credentialStore.iterateKeys()) {
        privateKey = key;
        break;
    }

    if (!privateKey) {
        privateKey = await credentialStore.generateKey();
    }

    const publicKeyLength = calculatePublicKeyLength();
    const [publicKeyBase64Length] = calculateBase64EncodedLength(publicKeyLength);

    // The public key is null terminated,
    // So we allocate the buffer with one extra byte.
    const publicKeyBuffer = new ArrayBuffer(publicKeyBase64Length + 1);

    calculatePublicKey(privateKey, publicKeyBuffer);
    encodeBase64(publicKeyBuffer, 0, publicKeyLength, publicKeyBuffer);

    yield {
        command: AdbCommand.Auth,
        arg0: AdbAuthType.PublicKey,
        arg1: 0,
        payload: publicKeyBuffer,
    };
};

export const AdbDefaultAuthenticators: AdbAuthenticator[] = [
    AdbSignatureAuthenticator,
    AdbPublicKeyAuthenticator,
];

export class AdbAuthenticationHandler implements Disposable {
    readonly authenticators: readonly AdbAuthenticator[];

    private readonly credentialStore: AdbCredentialStore;

    private pendingRequest = new PromiseResolver<AdbPacket>();

    private iterator: AsyncIterator<AdbPacketInit> | undefined;

    constructor(
        authenticators: readonly AdbAuthenticator[],
        credentialStore: AdbCredentialStore
    ) {
        this.authenticators = authenticators;
        this.credentialStore = credentialStore;
    }

    private getNextRequest = (): Promise<AdbPacket> => {
        return this.pendingRequest.promise;
    };

    private async* runAuthenticator(): AsyncGenerator<AdbPacketInit> {
        for (const authenticator of this.authenticators) {
            for await (const packet of authenticator(this.credentialStore, this.getNextRequest)) {
                // If the authenticator yielded a response
                // Prepare `nextRequest` for next authentication request
                this.pendingRequest = new PromiseResolver<AdbPacket>();

                // Yield the response to outer layer
                yield packet;
            }

            // If the authenticator returned,
            // Next authenticator will be given the same `pendingRequest`
        }

        throw new Error('Cannot authenticate with device');
    }

    async handle(packet: AdbPacket): Promise<AdbPacketInit> {
        if (!this.iterator) {
            this.iterator = this.runAuthenticator();
        }

        this.pendingRequest.resolve(packet);
        const result = await this.iterator.next();
        return result.value;
    }

    dispose() {
        this.iterator?.return?.();
    }
}
