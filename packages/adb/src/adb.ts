import { PromiseResolver } from '@yume-chan/async-operation-manager';
import { DisposableList } from '@yume-chan/event';
import { AdbAuthenticationHandler, AdbDefaultAuthenticators } from './auth';
import { AdbBackend } from './backend';
import { AdbReadableStream } from './buffered-stream';
import { AdbCommand } from './packet';
import { AdbPacketDispatcher, AdbStream } from './stream';
import { AdbSync } from './sync';

export enum AdbPropKey {
    Product = 'ro.product.name',
    Model = 'ro.product.model',
    Device = 'ro.product.device',
    Features = 'features',
}

export class Adb {
    private backend: AdbBackend;
    public get onDisconnected() { return this.backend.onDisconnected; }

    private _connected = false;
    public get connected() { return this._connected; }

    public get name() { return this.backend.name; }

    private _product: string | undefined;
    public get product() { return this._product; }

    private _model: string | undefined;
    public get model() { return this._model; }

    private _device: string | undefined;
    public get device() { return this._device; }

    private _features: string[] | undefined;
    public get features() { return this._features; }

    private packetDispatcher: AdbPacketDispatcher;

    public constructor(backend: AdbBackend) {
        this.backend = backend;
        this.packetDispatcher = new AdbPacketDispatcher(backend);

        backend.onDisconnected(this.dispose, this);
    }

    public async connect(authenticators = AdbDefaultAuthenticators) {
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
        const authHandler = new AdbAuthenticationHandler(authenticators, this.backend);
        const disposableList = new DisposableList();
        disposableList.add(this.packetDispatcher.onPacket(async (e) => {
            e.handled = true;

            const { packet } = e;
            try {
                switch (packet.command) {
                    case AdbCommand.Connect:
                        if (packet.arg0 !== version) {
                            throw new Error('Version mismatch');
                        }

                        this.parseBanner(this.backend.decodeUtf8(packet.payload!));
                        resolver.resolve();
                        break;
                    case AdbCommand.Auth:
                        const authPacket = await authHandler.tryNextAuth(e.packet);
                        await this.packetDispatcher.sendPacket(authPacket);
                        break;
                    case AdbCommand.Close:
                        // Last connection was interrupted
                        // Ignore this packet, device will recover
                        break;
                    default:
                        throw new Error('Device not in correct state. Reconnect your device and try again');
                }
            } catch (e) {
                resolver.reject(e);
            }
        }));

        disposableList.add(this.packetDispatcher.onError(e => {
            resolver.reject(e);
        }));

        await this.packetDispatcher.sendPacket(
            AdbCommand.Connect,
            version,
            0x100000,
            `host::features=${features}`
        );

        try {
            await resolver.promise;
            this._connected = true;
        } finally {
            disposableList.dispose();
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

    public shell(command: string, ...args: string[]): Promise<string>;
    public shell(): Promise<AdbStream>;
    public shell(command?: string, ...args: string[]): Promise<AdbStream | string> {
        // TODO: use shell protocol
        if (!command) {
            return this.createStream('shell:');
        } else {
            return this.createStreamAndReadAll(`shell:${command} ${args.join(' ')}`);
        }
    }

    public async getDaemonTcpAddresses(): Promise<string[]> {
        const propAddr = (await this.shell('getprop', 'service.adb.listen_addrs')).trim();
        if (propAddr) {
            return propAddr.split(',');
        }

        let port = (await this.shell('getprop', 'service.adb.tcp.port')).trim();
        if (port) {
            return [`0.0.0.0:${port}`];
        }

        port = (await this.shell('getprop', 'persist.adb.tcp.port')).trim();
        if (port) {
            return [`0.0.0.0:${port}`];
        }

        return [];
    }

    public setDaemonTcpPort(port = 5555): Promise<string> {
        return this.createStreamAndReadAll(`tcpip:${port}`);
    }

    public disableDaemonTcp(): Promise<string> {
        return this.createStreamAndReadAll('usb:');
    }

    public async sync(): Promise<AdbSync> {
        const stream = await this.createStream('sync:');
        return new AdbSync(stream);
    }

    public async createStream(service: string): Promise<AdbStream> {
        return this.packetDispatcher.createStream(service);
    }

    public async createStreamAndReadAll(service: string): Promise<string> {
        const stream = await this.createStream(service);
        const readable = new AdbReadableStream(stream);
        return readable.readAll();
    }

    public async dispose() {
        this.packetDispatcher.dispose();
        await this.backend.dispose();
    }
}
