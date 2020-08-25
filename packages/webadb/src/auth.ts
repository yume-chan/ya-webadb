import base64Encode from './base64';
import { generateKey, sign } from './crypto';
import { stringToArrayBuffer } from './decode';
import { AdbPacket } from './packet';
import { AdbAuthType, AdbCommand } from './webadb';

export interface AdbAuthMethod {
    auth(packet: AdbPacket): Promise<AdbPacket | undefined>;
}

const PublicKeyStorageKey = 'public-key';
const PrivateKeyStorageKey = 'private-key';

export const SignatureAuthMethod: AdbAuthMethod = {
    async auth(packet: AdbPacket): Promise<AdbPacket | undefined> {
        const privateKeyBase64 = window.localStorage.getItem(PrivateKeyStorageKey);
        if (!privateKeyBase64) {
            return undefined;
        }

        const privateKey = stringToArrayBuffer(atob(privateKeyBase64));
        const signature = sign(privateKey, packet.payload!);
        return new AdbPacket(AdbCommand.Auth, AdbAuthType.Signature, 0, signature);
    }
}

export const PublicKeyAuthMethod: AdbAuthMethod = {
    async auth(): Promise<AdbPacket> {
        let publicKeyBase64 = window.localStorage.getItem(PublicKeyStorageKey);
        if (!publicKeyBase64) {
            const [privateKey, publicKey] = await generateKey();

            publicKeyBase64 = base64Encode(publicKey);
            window.localStorage.setItem(PublicKeyStorageKey, publicKeyBase64);

            const privateKeyBase64 = base64Encode(privateKey);
            window.localStorage.setItem(PrivateKeyStorageKey, privateKeyBase64);
        }

        return new AdbPacket(AdbCommand.Auth, AdbAuthType.PublicKey, 0, publicKeyBase64);
    }
}

export class AdbAuthHandler {
    public readonly methods: readonly AdbAuthMethod[];

    private index = 0;

    public constructor(methods: readonly AdbAuthMethod[]) {
        this.methods = methods;
    }

    public async tryNext(packet: AdbPacket): Promise<AdbPacket> {
        while (this.index < this.methods.length) {
            const result = await this.methods[this.index].auth(packet);
            this.index += 1;
            if (result) {
                return result;
            }
        }

        throw new Error('Cannot authenticate with device');
    }
}
