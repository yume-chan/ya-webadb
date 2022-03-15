import { PromiseResolver } from '@yume-chan/async';
import { AdbAuthenticationHandler, AdbDefaultAuthenticators, type AdbCredentialStore } from './auth.js';
import { AdbPower, AdbReverseCommand, AdbSubprocess, AdbSync, AdbTcpIpCommand, escapeArg, framebuffer, install, type AdbFrameBuffer } from './commands/index.js';
import { AdbFeatures } from './features.js';
import { AdbCommand, AdbPacket, AdbPacketSerializeStream, calculateChecksum, type AdbPacketCore, type AdbPacketInit } from './packet.js';
import { AdbPacketDispatcher, AdbSocket } from './socket/index.js';
import { AbortController, DecodeUtf8Stream, GatherStringStream, pipeFrom, StructDeserializeStream, WritableStream, type ReadableWritablePair } from "./stream/index.js";
import { decodeUtf8, encodeUtf8 } from "./utils/index.js";

export enum AdbPropKey {
    Product = 'ro.product.name',
    Model = 'ro.product.model',
    Device = 'ro.product.device',
    Features = 'features',
}

export const VERSION_OMIT_CHECKSUM = 0x01000001;

export class Adb {
    public static createConnection(
        connection: ReadableWritablePair<Uint8Array, Uint8Array>
    ): ReadableWritablePair<AdbPacket, AdbPacketCore> {
        return {
            readable: connection.readable.pipeThrough(
                new StructDeserializeStream(AdbPacket)
            ),
            writable: pipeFrom(
                connection.writable,
                new AdbPacketSerializeStream()
            ),
        };
    }

    /**
     * It's possible to call `authenticate` multiple times on a single connection,
     * every time the device receives a `CNXN` packet it will reset its internal state,
     * and begin authentication again.
     */
    public static async authenticate(
        connection: ReadableWritablePair<AdbPacket, AdbPacketCore>,
        credentialStore: AdbCredentialStore,
        authenticators = AdbDefaultAuthenticators,
    ) {
        let version = 0x01000001;
        let maxPayloadSize = 0x100000;

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

        const resolver = new PromiseResolver<string>();
        const authHandler = new AdbAuthenticationHandler(authenticators, credentialStore);

        const abortController = new AbortController();
        const pipe = connection.readable
            .pipeTo(new WritableStream({
                async write(packet: AdbPacket) {
                    switch (packet.command) {
                        case AdbCommand.Connect:
                            version = Math.min(version, packet.arg0);
                            maxPayloadSize = Math.min(maxPayloadSize, packet.arg1);
                            resolver.resolve(decodeUtf8(packet.payload));
                            break;
                        case AdbCommand.Auth:
                            const response = await authHandler.handle(packet);
                            await sendPacket(response);
                            break;
                        case AdbCommand.Close:
                            // Last connection was interrupted
                            // Ignore this packet, device will recover
                            break;
                        default:
                            throw new Error('Device not in correct state. Reconnect your device and try again');
                    }
                }
            }), {
                preventCancel: true,
                signal: abortController.signal,
            })
            .catch((e) => { resolver.reject(e); });

        const writer = connection.writable.getWriter();
        async function sendPacket(init: AdbPacketCore) {
            // Always send checksum in auth steps
            // Because we don't know if the device will ignore it yet.
            await writer.write(calculateChecksum(init));
        }

        await sendPacket({
            command: AdbCommand.Connect,
            arg0: version,
            arg1: maxPayloadSize,
            // The terminating `;` is required in formal definition
            // But ADB daemon (all versions) can still work without it
            payload: encodeUtf8(`host::features=${features};`),
        });

        try {
            const banner = await resolver.promise;

            // Stop piping before creating Adb object
            // Because AdbPacketDispatcher will try to lock the streams when initializing
            abortController.abort();
            await pipe;

            writer.releaseLock();

            return new Adb(
                connection,
                version,
                maxPayloadSize,
                banner,
            );
        } finally {
            abortController.abort();
            writer.releaseLock();
        }
    }

    private readonly packetDispatcher: AdbPacketDispatcher;

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
        connection: ReadableWritablePair<AdbPacket, AdbPacketInit>,
        version: number,
        maxPayloadSize: number,
        banner: string,
    ) {
        this.parseBanner(banner);
        this.packetDispatcher = new AdbPacketDispatcher(connection);

        this._protocolVersion = version;
        if (version >= VERSION_OMIT_CHECKSUM) {
            this.packetDispatcher.calculateChecksum = false;
            // Android prior to 9.0.0 uses char* to parse service string
            // thus requires an extra null character
            this.packetDispatcher.appendNullToServiceString = false;
        }
        this.packetDispatcher.maxPayloadSize = maxPayloadSize;

        this.subprocess = new AdbSubprocess(this);
        this.power = new AdbPower(this);
        this.reverse = new AdbReverseCommand(this.packetDispatcher);
        this.tcpip = new AdbTcpIpCommand(this);
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
        const gatherStream = new GatherStringStream();
        await socket.readable
            .pipeThrough(new DecodeUtf8Stream())
            .pipeTo(gatherStream.writable);
        return gatherStream.result;
    }

    public async dispose(): Promise<void> {
        this.packetDispatcher.dispose();
    }
}
