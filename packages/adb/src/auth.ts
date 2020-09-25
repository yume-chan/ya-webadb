import { AutoDisposable, Disposable } from '@yume-chan/event';
import { AdbBackend, AdbKeyIterator } from './backend';
import { calculatePublicKey, calculatePublicKeyLength, sign } from './crypto';
import { AdbCommand, AdbPacket } from './packet';
import { calculateBase64EncodedLength, encodeBase64 } from './utils';

export enum AdbAuthType {
    Token = 1,
    Signature = 2,
    PublicKey = 3,
}

export interface AdbAuthenticator extends Disposable {
    tryAuth(packet: AdbPacket): Promise<AdbPacket | undefined>;
}

export interface AdbAuthenticatorConstructor {
    new(backend: AdbBackend): AdbAuthenticator;
}

export class AdbSignatureAuthenticator implements AdbAuthenticator {
    private readonly backend: AdbBackend;

    private readonly iterator: AdbKeyIterator;

    private iteratorDone = false;

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
            this.iteratorDone = true;
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

    public dispose() {
        if (!this.iteratorDone) {
            this.iterator.return?.();
        }
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
            await iterator.return?.();
        } else {
            privateKey = await this.backend.generateKey();
        }

        const publicKeyLength = calculatePublicKeyLength();
        const publicKeyBase64Length = calculateBase64EncodedLength(publicKeyLength);

        // ADBd needs an extra null terminator,
        // So we allocate the buffer with one extra byte.
        const publicKeyBuffer = new ArrayBuffer(publicKeyBase64Length + 1);

        calculatePublicKey(privateKey, publicKeyBuffer);
        encodeBase64(publicKeyBuffer, 0, publicKeyLength, publicKeyBuffer);

        return new AdbPacket(
            this.backend,
            AdbCommand.Auth,
            AdbAuthType.PublicKey,
            0,
            publicKeyBuffer
        );
    }

    public dispose() {
        // do nothing
    }
}

export const AdbDefaultAuthenticators: AdbAuthenticatorConstructor[] = [
    AdbSignatureAuthenticator,
    AdbPublicKeyAuthenticator
];

export class AdbAuthenticationHandler extends AutoDisposable {
    public readonly authenticators: readonly AdbAuthenticator[];

    private index = 0;

    public constructor(
        authenticators: readonly AdbAuthenticatorConstructor[],
        backend: AdbBackend
    ) {
        super();

        this.authenticators = authenticators.map(
            Constructor => this.addDisposable(new Constructor(backend))
        );
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
