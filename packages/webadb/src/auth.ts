import base64Encode from './base64';
import { generateKey, sign } from './crypto';
import { stringToArrayBuffer } from './decode';
import { AdbPacket } from './packet';
import { AdbAuthType, AdbCommand } from './webadb';

export interface AdbAuthMethod {
    tryAuth(packet: AdbPacket): Promise<AdbPacket | undefined>;
}

const PublicKeyStorageKey = 'public-key';
const PrivateKeyStorageKey = 'private-key';

export class SignatureAuthMethod implements AdbAuthMethod {
    private keys: string[] = [];

    private index = 0;

    public constructor() {
        const privateKeyBase64 = window.localStorage.getItem(PrivateKeyStorageKey);
        if (privateKeyBase64) {
            this.keys.push(privateKeyBase64);
        }
    }

    public async tryAuth(packet: AdbPacket): Promise<AdbPacket | undefined> {
        if (this.index === this.keys.length) {
            return undefined
        }

        const privateKey = stringToArrayBuffer(atob(this.keys[this.index]));
        this.index += 1;

        const signature = sign(privateKey, packet.payload!);
        return new AdbPacket(AdbCommand.Auth, AdbAuthType.Signature, 0, signature);
    }
}

export const PublicKeyAuthMethod: AdbAuthMethod = {
    async tryAuth(): Promise<AdbPacket> {
        let publicKeyBase64 = window.localStorage.getItem(PublicKeyStorageKey);
        if (!publicKeyBase64) {
            const [privateKey, publicKey] = await generateKey();

            publicKeyBase64 = base64Encode(publicKey);
            window.localStorage.setItem(PublicKeyStorageKey, publicKeyBase64);

            const privateKeyBase64 = base64Encode(privateKey);
            window.localStorage.setItem(PrivateKeyStorageKey, privateKeyBase64);
        }

        // adbd needs the extra null character
        return new AdbPacket(AdbCommand.Auth, AdbAuthType.PublicKey, 0, publicKeyBase64 + '\0');
    }
}

export class AdbAuthHandler {
    public readonly methods: readonly AdbAuthMethod[];

    private index = 0;

    public constructor(methods: readonly AdbAuthMethod[]) {
        this.methods = methods;
    }

    public async tryNextAuth(packet: AdbPacket): Promise<AdbPacket> {
        while (this.index < this.methods.length) {
            const result = await this.methods[this.index].tryAuth(packet);
            if (result) {
                return result;
            }

            this.index += 1;
        }

        throw new Error('Cannot authenticate with device');
    }
}
