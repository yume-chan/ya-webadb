import { PromiseResolver } from '@yume-chan/async-operation-manager';
import { Disposable } from '@yume-chan/event';
import { AdbBackend } from './backend';
import { calculatePublicKey, calculatePublicKeyLength, sign } from './crypto';
import { AdbCommand, AdbPacket, AdbPacketInit } from './packet';
import { calculateBase64EncodedLength, encodeBase64 } from './utils';

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
        backend: AdbBackend,
        getNextRequest: () => Promise<AdbPacket>
    ): AsyncIterable<AdbPacketInit>;
}

export const AdbSignatureAuthenticator: AdbAuthenticator = async function* (
    backend: AdbBackend,
    getNextRequest: () => Promise<AdbPacket>,
): AsyncIterable<AdbPacketInit> {
    for await (const key of backend.iterateKeys()) {
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
    backend: AdbBackend,
    getNextRequest: () => Promise<AdbPacket>,
): AsyncIterable<AdbPacketInit> {
    const packet = await getNextRequest();

    if (packet.arg0 !== AdbAuthType.Token) {
        return;
    }

    let privateKey: ArrayBuffer | undefined;
    for await (const key of backend.iterateKeys()) {
        privateKey = key;
        break;
    }

    if (!privateKey) {
        privateKey = await backend.generateKey();
    }

    const publicKeyLength = calculatePublicKeyLength();
    const publicKeyBase64Length = calculateBase64EncodedLength(publicKeyLength);

    // The public key is null terminated,
    // So we allocate the buffer with one extra byte.
    const publicKeyBuffer = new ArrayBuffer(publicKeyBase64Length + 1);

    calculatePublicKey(privateKey, publicKeyBuffer);
    encodeBase64(publicKeyBuffer, 0, publicKeyLength, publicKeyBuffer);

    yield {
        command: AdbCommand.Auth,
        arg0: AdbAuthType.PublicKey,
        arg1: 0,
        payload: publicKeyBuffer
    };
};

export const AdbDefaultAuthenticators: AdbAuthenticator[] = [
    AdbSignatureAuthenticator,
    AdbPublicKeyAuthenticator
];

export class AdbAuthenticationHandler implements Disposable {
    public readonly authenticators: readonly AdbAuthenticator[];

    private readonly backend: AdbBackend;

    private pendingRequest = new PromiseResolver<AdbPacket>();

    private iterator: AsyncIterator<AdbPacketInit> | undefined;

    public constructor(
        authenticators: readonly AdbAuthenticator[],
        backend: AdbBackend
    ) {
        this.authenticators = authenticators;
        this.backend = backend;
    }

    private getNextRequest = (): Promise<AdbPacket> => {
        return this.pendingRequest.promise;
    };

    private async* runAuthenticator(): AsyncGenerator<AdbPacketInit> {
        for (const authenticator of this.authenticators) {
            for await (const packet of authenticator(this.backend, this.getNextRequest)) {
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

    public async next(packet: AdbPacket): Promise<AdbPacketInit> {
        if (!this.iterator) {
            this.iterator = this.runAuthenticator();
        }

        this.pendingRequest.resolve(packet);
        const result = await this.iterator.next();
        return result.value;
    }

    public dispose() {
        this.iterator?.return?.();
    }
}
