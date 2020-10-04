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
    (backend: AdbBackend, packet: AdbPacket): AsyncIterator<AdbPacketInit, void, AdbPacket>;
}

export async function* AdbSignatureAuthenticator(
    backend: AdbBackend,
    packet: AdbPacket,
): AsyncIterator<AdbPacketInit, void, AdbPacket> {
    for await (const key of backend.iterateKeys()) {
        if (packet.arg0 !== AdbAuthType.Token) {
            return;
        }

        const signature = sign(key, packet.payload!);

        packet = yield {
            command: AdbCommand.Auth,
            arg0: AdbAuthType.Signature,
            arg1: 0,
            payload: signature
        };
    }
}

export async function* AdbPublicKeyAuthenticator(
    backend: AdbBackend,
    packet: AdbPacket,
): AsyncIterator<AdbPacketInit, void, AdbPacket> {
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

    // ADBd needs an extra null terminator,
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
}

export const AdbDefaultAuthenticators: AdbAuthenticator[] = [
    AdbSignatureAuthenticator,
    AdbPublicKeyAuthenticator
];

export class AdbAuthenticationHandler implements Disposable {
    public readonly authenticators: readonly AdbAuthenticator[];

    private readonly backend: AdbBackend;

    private iterator: AsyncIterator<AdbPacketInit, never, AdbPacket> | undefined;

    public constructor(
        authenticators: readonly AdbAuthenticator[],
        backend: AdbBackend
    ) {
        this.authenticators = authenticators;
        this.backend = backend;
    }

    private async* nextCore(packet: AdbPacket): AsyncGenerator<AdbPacketInit, never, AdbPacket> {
        for (const authenticator of this.authenticators) {
            const iterator = authenticator(this.backend, packet);
            try {
                let result = await iterator.next();
                while (!result.done) {
                    packet = yield result.value;
                    result = await iterator.next(packet);
                }
            } finally {
                iterator.return?.();
            }
        }

        throw new Error('Cannot authenticate with device');
    }

    public async next(packet: AdbPacket): Promise<AdbPacketInit> {
        if (!this.iterator) {
            this.iterator = this.nextCore(packet);
        }

        const result = await this.iterator.next(packet);
        return result.value;
    }

    public dispose() {
        this.iterator?.return?.();
    }
}
