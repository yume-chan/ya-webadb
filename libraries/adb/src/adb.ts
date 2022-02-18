import { PromiseResolver } from '@yume-chan/async';
import { DisposableList } from '@yume-chan/event';
import { AdbAuthenticationHandler, AdbCredentialStore, AdbDefaultAuthenticators } from './auth';
import { AdbBackend } from './backend';
import { AdbFrameBuffer, AdbPower, AdbReverseCommand, AdbSubprocess, AdbSync, AdbTcpIpCommand, escapeArg, framebuffer, install } from './commands';
import { AdbFeatures } from './features';
import { AdbCommand } from './packet';
import { AdbLogger, AdbPacketDispatcher, AdbSocket } from './socket';
import { decodeUtf8, ReadableStream, WritableStream } from "./utils";

export enum AdbPropKey {
    Product = 'ro.product.name',
    Model = 'ro.product.model',
    Device = 'ro.product.device',
    Features = 'features',
}

export class Adb {
    public static async connect(backend: AdbBackend, logger?: AdbLogger) {
        const { readable, writable } = await backend.connect();
        return new Adb(backend, readable, writable, logger);
    }

    private readonly _backend: AdbBackend;

    public get backend(): AdbBackend { return this._backend; }

    private readonly packetDispatcher: AdbPacketDispatcher;

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

    public readonly subprocess: AdbSubprocess;
    public readonly power: AdbPower;
    public readonly reverse: AdbReverseCommand;
    public readonly tcpip: AdbTcpIpCommand;

    public constructor(
        backend: AdbBackend,
        readable: ReadableStream<ArrayBuffer>,
        writable: WritableStream<ArrayBuffer>,
        logger?: AdbLogger
    ) {
        this._backend = backend;
        this.packetDispatcher = new AdbPacketDispatcher(readable, writable, logger);

        this.subprocess = new AdbSubprocess(this);
        this.power = new AdbPower(this);
        this.reverse = new AdbReverseCommand(this.packetDispatcher);
        this.tcpip = new AdbTcpIpCommand(this);
    }

    public async authenticate(
        credentialStore: AdbCredentialStore,
        authenticators = AdbDefaultAuthenticators
    ): Promise<void> {
        this.packetDispatcher.maxPayloadSize = 0x1000;
        this.packetDispatcher.calculateChecksum = true;
        this.packetDispatcher.appendNullToServiceString = true;

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
        const authHandler = new AdbAuthenticationHandler(authenticators, credentialStore);
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

                        this.parseBanner(decodeUtf8(packet.payload!));
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

        await this.packetDispatcher.sendPacket(
            AdbCommand.Connect,
            version,
            maxPayloadSize,
            // The terminating `;` is required in formal definition
            // But ADB daemon can also work without it
            `host::features=${features};`
        );

        try {
            await resolver.promise;
        } finally {
            disposableList.dispose();
        }
    }

    private parseBanner(banner: string): void {
        this._features = [];

        const pieces = banner.split('::');
        if (pieces.length > 1) {
            const props = pieces[1]!;
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
                        this._features = value!.split(',') as AdbFeatures[];
                        break;
                }
            }
        }
    }

    public async getProp(key: string): Promise<string> {
        const stdout = await this.subprocess.spawnAndWaitLegacy(
            ['getprop', key]
        );
        return stdout.trim();
    }

    public async rm(...filenames: string[]): Promise<string> {
        const stdout = await this.subprocess.spawnAndWaitLegacy(
            ['rm', '-rf', ...filenames.map(arg => escapeArg(arg))],
        );
        return stdout;
    }

    public install() {
        return install(this);
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

    public async createSocketAndWait(service: string): Promise<string> {
        const socket = await this.createSocket(service);
        let result = '';
        for await (const chunk of socket.readable) {
            result += decodeUtf8(chunk);
        }
        return result;
    }

    public async dispose(): Promise<void> {
        this.packetDispatcher.dispose();
    }
}
