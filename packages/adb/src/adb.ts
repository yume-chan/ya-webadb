import { PromiseResolver } from '@yume-chan/async';
import { DisposableList } from '@yume-chan/event';
import { AdbAuthenticationHandler, AdbDefaultAuthenticators } from './auth';
import { AdbBackend } from './backend';
import { AdbChildProcess, AdbDemoMode, AdbFrameBuffer, AdbReverseCommand, AdbSync, AdbTcpIpCommand, escapeArg, framebuffer, install } from './commands';
import { AdbFeatures } from './features';
import { AdbCommand } from './packet';
import { AdbLogger, AdbPacketDispatcher, AdbSocket } from './socket';

export enum AdbPropKey {
    Product = 'ro.product.name',
    Model = 'ro.product.model',
    Device = 'ro.product.device',
    Features = 'features',
}

export class Adb {
    private packetDispatcher: AdbPacketDispatcher;

    public get backend(): AdbBackend { return this.packetDispatcher.backend; }

    public get onDisconnected() { return this.backend.onDisconnected; }

    private _connected = false;
    public get connected() { return this._connected; }

    public get name() { return this.backend.name; }

    private _protocolVersion: number | undefined;
    public get protocolVersion() { return this._protocolVersion; }

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

    public readonly demoMode: AdbDemoMode;

    public readonly childProcess: AdbChildProcess;

    public constructor(backend: AdbBackend, logger?: AdbLogger) {
        this.packetDispatcher = new AdbPacketDispatcher(backend, logger);

        this.tcpip = new AdbTcpIpCommand(this);
        this.reverse = new AdbReverseCommand(this.packetDispatcher);
        this.demoMode = new AdbDemoMode(this);
        this.childProcess = new AdbChildProcess(this);

        backend.onDisconnected(this.dispose, this);
    }

    public async connect(authenticators = AdbDefaultAuthenticators): Promise<void> {
        await this.backend.connect?.();
        this.packetDispatcher.maxPayloadSize = 0x1000;
        this.packetDispatcher.calculateChecksum = true;
        this.packetDispatcher.appendNullToServiceString = true;
        this.packetDispatcher.start();

        const version = 0x01000001;
        const versionNoChecksum = 0x01000001;
        const maxPayloadSize = 0x100000;

        const features = [
            'shell_v2',
            'cmd',
            AdbFeatures.StatV2,
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
                        this.packetDispatcher.maxPayloadSize = Math.min(maxPayloadSize, packet.arg1);

                        const finalVersion = Math.min(version, packet.arg0);
                        this._protocolVersion = finalVersion;

                        if (finalVersion >= versionNoChecksum) {
                            this.packetDispatcher.calculateChecksum = false;
                            // Android prior to 9.0.0 uses char* to parse service string
                            // thus requires an extra null character
                            this.packetDispatcher.appendNullToServiceString = false;
                        }

                        this.parseBanner(this.backend.decodeUtf8(packet.payload!));
                        resolver.resolve();
                        break;
                    case AdbCommand.Auth:
                        const authPacket = await authHandler.handle(e.packet);
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

        // Android prior 9.0.0 requires the null character
        // Newer versions can also handle the null character
        // The terminating `;` is required in formal definition
        // But ADB daemon can also work without it
        await this.packetDispatcher.sendPacket(
            AdbCommand.Connect,
            version,
            maxPayloadSize,
            `host::features=${features};\0`
        );

        try {
            await resolver.promise;
            this._connected = true;
        } finally {
            disposableList.dispose();
        }
    }

    private parseBanner(banner: string): void {
        this._features = [];

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

    public async getProp(key: string): Promise<string> {
        const output = await this.childProcess.exec('getprop', key);
        return output.trim();
    }

    public async rm(...filenames: string[]): Promise<string> {
        return await this.childProcess.exec('rm', '-rf', ...filenames.map(arg => escapeArg(arg)));
    }

    public async install(
        apk: ArrayLike<number> | ArrayBufferLike | AsyncIterable<ArrayBuffer>,
        onProgress?: (uploaded: number) => void,
    ): Promise<void> {
        return await install(this, apk, onProgress);
    }

    public async sync(): Promise<AdbSync> {
        const socket = await this.createSocket('sync:');
        return new AdbSync(this, socket);
    }

    public async framebuffer(): Promise<AdbFrameBuffer> {
        return framebuffer(this);
    }

    public async createSocket(service: string): Promise<AdbSocket> {
        return this.packetDispatcher.createSocket(service);
    }

    public async createSocketAndReadAll(service: string): Promise<string> {
        const socket = await this.createSocket(service);
        const resolver = new PromiseResolver<string>();
        let result = '';
        socket.onData(buffer => {
            result += this.backend.decodeUtf8(buffer);
        });
        socket.onClose(() => resolver.resolve(result));
        return resolver.promise;
    }

    public async dispose(): Promise<void> {
        this.packetDispatcher.dispose();
        await this.backend.dispose();
    }
}
