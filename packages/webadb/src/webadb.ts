import AsyncOperationManager from '@yume-chan/async-operation-manager';
import base64Encode from './base64';
import { generateKey, sign } from './crypto';
import { stringToArrayBuffer } from './decode';
import { AdbPacket } from './packet';
import { AdbStream } from './stream';
import { WebAdbTransportation } from './transportation';

export enum AdbCommand {
    Connect = 'CNXN',
    Auth = 'AUTH',
    OK = 'OKAY',
    Close = 'CLSE',
    Write = 'WRTE',
}

export enum AdbAuthType {
    Token = 1,
    Signature = 2,
    PublicKey = 3,
}

export enum AdbPropKey {
    Product = 'ro.product.name',
    Model = 'ro.product.model',
    Device = 'ro.product.device',
    Features = 'features',
}

export class WebAdb {
    private _transportation: WebAdbTransportation;

    public get name() { return this._transportation.name; }

    private _product: string | undefined;
    public get product() { return this._product; }

    private _model: string | undefined;
    public get model() { return this._model; }

    private _device: string | undefined;
    public get device() { return this._device; }

    private _features: string[] | undefined;
    public get features() { return this._features; }

    private _alive = true;
    private _looping = false;

    // ADB requires stream id to start from 1
    // (0 means open failed)
    private _streamInitializer = new AsyncOperationManager(1);
    private _streams = new Map<number, AdbStream>();

    public constructor(transportation: WebAdbTransportation) {
        this._transportation = transportation;
    }

    public async connect() {
        const version = 0x01000001;
        const features = [
            'shell_v2',
            'cmd',
            'stat_v2',
            'ls_v2',
            'fixed_push_mkdir',
            'apex',
            'abb',
            'fixed_push_symlink_timestamp',
            'abb_exec',
            'remount_shell',
            'track_app',
            'sendrecv_v2',
            'sendrecv_v2_brotli',
            'sendrecv_v2_lz4',
            'sendrecv_v2_zstd',
            'sendrecv_v2_dry_run_send',
        ].join(',');

        await this.sendPacket(AdbCommand.Connect, version, 0x100000, `host::features=${features}`);

        let triedSignatureAuth = false;
        while (true) {
            const response = await this.receiveMessage();
            switch (response.command) {
                case AdbCommand.Connect:
                    if (response.arg0 !== version) {
                        await this.dispose();
                        throw new Error('version mismatch');
                    }

                    this.parseBanner(response.payloadString!);
                    return;
                case AdbCommand.Auth:
                    if (response.arg0 !== AdbAuthType.Token) {
                        await this.dispose();
                        throw new Error('unknown auth type');
                    }

                    if (!triedSignatureAuth) {
                        triedSignatureAuth = true;
                        const signature = await this.signToken(response.payload!);
                        if (signature) {
                            await this.sendPacket(AdbCommand.Auth, AdbAuthType.Signature, 0, signature);
                            break;
                        }
                    }

                    const publicKey = await this.getPublicKey();
                    await this.sendPacket(AdbCommand.Auth, AdbAuthType.PublicKey, 0, publicKey + ' @unknown' + '\0');
                    break;
                default:
                    await this.dispose();
                    throw new Error('Device not in correct state. Reconnect your device and try again');
            }
        }
    }

    private parseBanner(banner: string) {
        const pieces = banner.split('::');
        if (pieces.length > 1) {
            const props = pieces[1];
            for (const prop of props.split(';')) {
                if (!prop) {
                    continue;
                }

                const keyValue = prop.split('=');
                if (keyValue.length !== 2) {
                    continue;
                }

                const [key, value] = keyValue;
                switch (key) {
                    case AdbPropKey.Product:
                        this._product = value;
                        break;
                    case AdbPropKey.Model:
                        this._model = value;
                        break;
                    case AdbPropKey.Device:
                        this._device = value;
                        break;
                    case AdbPropKey.Features:
                        this._features = value.split(',');
                        break;
                }
            }
        }
    }

    public async shell(command: string, ...args: string[]): Promise<string>;
    public async shell(): Promise<AdbStream>;
    public async shell(command?: string, ...args: string[]): Promise<AdbStream | string> {
        if (!command) {
            return this.createStream('shell:');
        } else {
            return this.createStreamAndWait(`shell:${command} ${args.join(' ')}`);
        }
    }

    public async tcpip(port = 5555): Promise<string> {
        return this.createStreamAndWait(`tcpip:${port}`);
    }

    public async usb(): Promise<string> {
        return this.createStreamAndWait('usb:');
    }

    public async sendPacket(command: string, arg0: number, arg1: number, payload?: string | ArrayBuffer): Promise<void> {
        const packet = new AdbPacket(command, arg0, arg1, payload);
        console.log('send',
            command,
            `0x${arg0.toString(16)}`,
            `0x${arg1.toString(16)}`,
            payload
        );
        await this._transportation.write(packet.toBuffer());
        if (packet.payloadLength !== 0) {
            await this._transportation.write(packet.payload!);
        }
    }

    private async receiveLoop(): Promise<void> {
        if (this._looping) {
            return;
        }

        this._looping = true;

        while (this._alive) {
            const response = await this.receiveMessage();
            switch (response.command) {
                case AdbCommand.OK:
                    // OKAY has two meanings
                    // 1. The device has created the Stream
                    this._streamInitializer.resolve(response.arg1, response.arg0);
                    // 2. The device has received last WRTE to the Stream
                    this._streams.get(response.arg1)?.ack();
                    break;
                case AdbCommand.Close:
                    // CLSE also has two meanings
                    if (response.arg0 === 0) {
                        // 1. The device don't want to create the Stream
                        this._streamInitializer.reject(response.arg1, new Error('open failed'));
                    } else {
                        // 2. The device has closed the Stream
                        this._streams.get(response.arg1)?.onCloseEvent.fire();
                        this._streams.delete(response.arg1);
                    }
                    break;
                case AdbCommand.Write:
                    this._streams.get(response.arg1)?.onDataEvent.fire(response.payload!);
                    await this.sendPacket('OKAY', response.arg1, response.arg0);
                    break;
                default:
                    await this.dispose();
                    throw new Error('unknown command');
            }
        }
    }

    public async createStream(command: string): Promise<AdbStream> {
        const { id: localId, promise: initializer } = this._streamInitializer.add<number>();
        await this.sendPacket('OPEN', localId, 0, command);
        this.receiveLoop();

        const remoteId = await initializer;
        const stream = new AdbStream(this, localId, remoteId);
        this._streams.set(localId, stream);
        return stream;
    }

    public async createStreamAndWait(command: string): Promise<string> {
        const stream = await this.createStream(command);
        return new Promise<string>((resolve) => {
            let output = '';
            const decoder = new TextDecoder();
            stream.onData((data) => {
                output += decoder.decode(data);
            });
            stream.onClose(() => {
                resolve(output);
            });
        });
    }

    public async receiveMessage() {
        console.log('receiving');

        const header = await this.receiveData(24);
        const packet = AdbPacket.parse(header);

        if (packet.payloadLength !== 0) {
            packet.payload = await this.receiveData(packet.payloadLength);
        }

        console.log('received',
            packet.command,
            `0x${packet.arg0.toString(16)}`,
            `0x${packet.arg1.toString(16)}`,
            packet.payload
        );
        return packet;
    }

    private async receiveData(length: number): Promise<ArrayBuffer> {
        return await this._transportation.read(length);
    }

    private async signToken(token: ArrayBuffer): Promise<ArrayBuffer | undefined> {
        if (token.byteLength !== 20) {
            return undefined;
        }

        const privateKeyBase64 = window.localStorage.getItem('private-key');
        if (!privateKeyBase64) {
            return undefined;
        }

        const privateKey = stringToArrayBuffer(atob(privateKeyBase64));
        return sign(privateKey, token);
    }

    private async getPublicKey(): Promise<string> {
        const value = window.localStorage.getItem('public-key');
        if (value) {
            return value;
        }

        const [privateKey, publicKey] = await generateKey();

        const publicKeyBase64 = base64Encode(publicKey);
        window.localStorage.setItem('public-key', publicKeyBase64);

        const privateKeyBase64 = base64Encode(privateKey);
        window.localStorage.setItem('private-key', privateKeyBase64);

        return publicKeyBase64;
    }

    public async dispose() {
        for (const [localId, stream] of this._streams) {
            await stream.close();
        }
        await this._transportation.dispose();
    }
}
