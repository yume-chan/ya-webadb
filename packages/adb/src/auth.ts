import { AdbBackend, AdbKeyIterator } from './backend';
import { encodeBase64 } from './base64';
import { calculatePublicKey, sign } from './crypto';
import { AdbCommand, AdbPacket } from './packet';

export enum AdbAuthType {
    Token = 1,
    Signature = 2,
    PublicKey = 3,
}

export interface AdbAuthenticator {
    tryAuth(packet: AdbPacket): Promise<AdbPacket | undefined>;
}

export interface AdbAuthenticatorConstructor {
    new(backend: AdbBackend): AdbAuthenticator;
}

export class AdbSignatureAuthenticator implements AdbAuthenticator {
    private readonly backend: AdbBackend;

    private readonly iterator: AdbKeyIterator;

    public constructor(backend: AdbBackend) {
        this.backend = backend;
        this.iterator = backend.iterateKeys();
    }

    public async tryAuth(packet: AdbPacket): Promise<AdbPacket | undefined> {
        if (packet.arg0 !== AdbAuthType.Token) {
            return undefined;
        }

        const next = await this.iterator.next();
        if (next.done) {
            return undefined;
        }

        const signature = sign(next.value, packet.payload!);
        return new AdbPacket(
            this.backend,
            AdbCommand.Auth,
            AdbAuthType.Signature,
            0,
            signature
        );
    }
}

export class AdbPublicKeyAuthenticator implements AdbAuthenticator {
    private backend: AdbBackend;

    public constructor(backend: AdbBackend) {
        this.backend = backend;
    }

    public async tryAuth(): Promise<AdbPacket> {
        let privateKey: ArrayBuffer;

        const iterator = this.backend.iterateKeys();
        const next = await iterator.next();
        if (!next.done) {
            privateKey = next.value;
        } else {
            privateKey = await this.backend.generateKey();
        }

        const publicKey = calculatePublicKey(privateKey);
        return new AdbPacket(
            this.backend,
            AdbCommand.Auth,
            AdbAuthType.PublicKey,
            0,
            // adbd needs the extra null character
            encodeBase64(publicKey) + '\0'
        );
    }
}

export const AdbDefaultAuthenticators: AdbAuthenticatorConstructor[] = [
    AdbSignatureAuthenticator,
    AdbPublicKeyAuthenticator
];

export class AdbAuthenticationHandler {
    public readonly authenticators: readonly AdbAuthenticator[];

    private index = 0;

    public constructor(
        authenticators: readonly AdbAuthenticatorConstructor[],
        backend: AdbBackend
    ) {
        this.authenticators = authenticators.map(Constructor => new Constructor(backend));
    }

    public async tryNextAuth(packet: AdbPacket): Promise<AdbPacket> {
        while (this.index < this.authenticators.length) {
            const result = await this.authenticators[this.index].tryAuth(packet);
            if (result) {
                return result;
            }

            this.index += 1;
        }

        throw new Error('Cannot authenticate with device');
    }
}
