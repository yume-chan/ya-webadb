import { PromiseResolver } from '@yume-chan/async-operation-manager';
import { AdbAuthHandler, PublicKeyAuthMethod, SignatureAuthMethod } from './auth';
import { AdbPacket } from './packet';
import { AdbStream, AdbStreamDispatcher } from './stream';
import { WebAdbTransportation } from './transportation';

export enum AdbCommand {
    Connect = 'CNXN',
    Auth = 'AUTH',
    OK = 'OKAY',
    Close = 'CLSE',
    Write = 'WRTE',
    Open = 'OPEN',
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

    private streamDispatcher: AdbStreamDispatcher;

    public constructor(transportation: WebAdbTransportation) {
        this._transportation = transportation;
        this.streamDispatcher = new AdbStreamDispatcher(transportation);
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

        const resolver = new PromiseResolver<void>();
        const authHandler = new AdbAuthHandler([SignatureAuthMethod, PublicKeyAuthMethod]);
        const removeListener = this.streamDispatcher.onPacket(async (e) => {
            e.handled = true;

            const { packet } = e;
            try {
                switch (packet.command) {
                    case AdbCommand.Connect:
                        if (packet.arg0 !== version) {
                            throw new Error('Version mismatch');
                        }

                        this.parseBanner(packet.payloadString!);
                        resolver.resolve();
                        break;
                    case AdbCommand.Auth:
                        if (packet.arg0 !== AdbAuthType.Token) {
                            throw new Error('Unknown auth type');
                        }

                        await this.streamDispatcher.sendPacket(await authHandler.tryNext(e.packet));
                        break;
                    case AdbCommand.Close:
                        // Last connection was interrupted
                        // Ignore this packet, device will recover
                        break;
                    default:
                        throw new Error('Device not in correct state. Reconnect your device and try again');
                }
            } catch (e) {
                await this.dispose();
                resolver.reject(e);
            }
        });

        await this.streamDispatcher.sendPacket(new AdbPacket(AdbCommand.Connect, version, 0x100000, `host::features=${features}`));

        try {
            await resolver.promise;
        } finally {
            removeListener();
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
            return this.createStreamAndReadAll(`shell:${command} ${args.join(' ')}`);
        }
    }

    public async tcpip(port = 5555): Promise<string> {
        return this.createStreamAndReadAll(`tcpip:${port}`);
    }

    public usb(): Promise<string> {
        return this.createStreamAndReadAll('usb:');
    }

    public async createStream(payload: string): Promise<AdbStream> {
        return this.streamDispatcher.createStream(payload);
    }

    public async createStreamAndReadAll(payload: string): Promise<string> {
        const stream = await this.createStream(payload);
        return stream.readAll();
    }

    public async dispose() {
        await this.streamDispatcher.dispose();
        await this._transportation.dispose();
    }
}
