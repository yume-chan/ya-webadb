import { PromiseResolver } from '@yume-chan/async-operation-manager';
import { DisposableList } from '@yume-chan/event';
import { AdbAuthenticationHandler, AdbDefaultAuthenticators } from './auth';
import { AdbBackend } from './backend';
import { AdbFrameBuffer, AdbReverseCommand, AdbSync, AdbTcpIpCommand } from './commands';
import { AdbFeatures } from './features';
import { AdbCommand } from './packet';
import { AdbBufferedStream, AdbPacketDispatcher, AdbStream } from './stream';

export enum AdbPropKey {
    Product = 'ro.product.name',
    Model = 'ro.product.model',
    Device = 'ro.product.device',
    Features = 'features',
}

export class Adb {
    private packetDispatcher: AdbPacketDispatcher;

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

    private _features: AdbFeatures[] | undefined;
    public get features() { return this._features; }

    public readonly tcpip: AdbTcpIpCommand;

    public readonly reverse: AdbReverseCommand;

    public constructor(backend: AdbBackend) {
        this.backend = backend;

        this.packetDispatcher = new AdbPacketDispatcher(backend);

        this.tcpip = new AdbTcpIpCommand(this);
        this.reverse = new AdbReverseCommand(this.packetDispatcher);

        backend.onDisconnected(this.dispose, this);
    }

    public async connect(authenticators = AdbDefaultAuthenticators) {
        await this.backend.connect?.();
        this.packetDispatcher.start();

        const version = 0x01000001;

        const features = [
            'shell_v2', // 9
            'cmd', // 7
            AdbFeatures.StatV2, // 5
            'ls_v2',
            'fixed_push_mkdir', // 4
            'apex', // 2
            'abb', // 8
            'fixed_push_symlink_timestamp', // 1
            'abb_exec', // 6
            'remount_shell', // 3
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
                        const authPacket = await authHandler.next(e.packet);
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
                        this._features = value.split(',') as AdbFeatures[];
                        break;
                }
            }
        }
    }

    public shell(): Promise<AdbStream> {
        return this.createStream('shell:');
    }

    public spawn(command: string, ...args: string[]): Promise<AdbStream> {
        // TODO: use shell protocol
        return this.createStream(`shell:${command} ${args.join(' ')}`);
    }

    public exec(command: string, ...args: string[]): Promise<string> {
        // TODO: use shell protocol
        return this.createStreamAndReadAll(`shell:${command} ${args.join(' ')}`);
    }

    public async getProp(key: string): Promise<string> {
        const output = await this.exec('getprop', key);
        return output.trim();
    }

    public async sync(): Promise<AdbSync> {
        const stream = await this.createStream('sync:');
        return new AdbSync(this, stream);
    }

    public async framebuffer(): Promise<AdbFrameBuffer> {
        const stream = await this.createStream('framebuffer:');
        const buffered = new AdbBufferedStream(stream);
        return AdbFrameBuffer.deserialize(buffered);
    }

    public async createStream(service: string): Promise<AdbStream> {
        return this.packetDispatcher.createStream(service);
    }

    public async createStreamAndReadAll(service: string): Promise<string> {
        const stream = await this.createStream(service);
        const resolver = new PromiseResolver<string>();
        let result = '';
        stream.onData(buffer => {
            result += this.backend.decodeUtf8(buffer);
        });
        stream.onClose(() => resolver.resolve(result));
        return resolver.promise;
    }

    public async dispose() {
        this.packetDispatcher.dispose();
        await this.backend.dispose();
    }
}
