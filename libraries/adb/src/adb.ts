import { PromiseResolver } from "@yume-chan/async";
import type { Consumable, ReadableWritablePair } from "@yume-chan/stream-extra";
import {
    AbortController,
    ConsumableWritableStream,
    DecodeUtf8Stream,
    GatherStringStream,
    WritableStream,
} from "@yume-chan/stream-extra";

import type { AdbCredentialStore } from "./auth.js";
import {
    ADB_DEFAULT_AUTHENTICATORS,
    AdbAuthenticationProcessor,
} from "./auth.js";
import type { AdbFrameBuffer } from "./commands/index.js";
import {
    AdbPower,
    AdbReverseCommand,
    AdbSubprocess,
    AdbSync,
    AdbTcpIpCommand,
    escapeArg,
    framebuffer,
} from "./commands/index.js";
import { AdbFeature } from "./features.js";
import type { AdbPacketData, AdbPacketInit } from "./packet.js";
import { AdbCommand, calculateChecksum } from "./packet.js";
import type {
    AdbIncomingSocketHandler,
    AdbSocket,
    Closeable,
} from "./socket/index.js";
import { AdbPacketDispatcher } from "./socket/index.js";
import { decodeUtf8, encodeUtf8 } from "./utils/index.js";

export enum AdbPropKey {
    Product = "ro.product.name",
    Model = "ro.product.model",
    Device = "ro.product.device",
    Features = "features",
}

export const VERSION_OMIT_CHECKSUM = 0x01000001;

export class Adb implements Closeable {
    /**
     * It's possible to call `authenticate` multiple times on a single connection,
     * every time the device receives a `CNXN` packet, it resets its internal state,
     * and starts a new authentication process.
     */
    public static async authenticate(
        connection: ReadableWritablePair<
            AdbPacketData,
            Consumable<AdbPacketInit>
        >,
        credentialStore: AdbCredentialStore,
        authenticators = ADB_DEFAULT_AUTHENTICATORS
    ): Promise<Adb> {
        // Initially, set to highest-supported version and payload size.
        let version = 0x01000001;
        // Android 4: 4K, Android 7: 256K, Android 9: 1M
        let maxPayloadSize = 1024 * 1024;

        const resolver = new PromiseResolver<string>();
        const authProcessor = new AdbAuthenticationProcessor(
            authenticators,
            credentialStore
        );

        // Here is similar to `AdbPacketDispatcher`,
        // But the received packet types and send packet processing are different.
        const abortController = new AbortController();
        const pipe = connection.readable
            .pipeTo(
                new WritableStream({
                    async write(packet) {
                        switch (packet.command) {
                            case AdbCommand.Connect:
                                version = Math.min(version, packet.arg0);
                                maxPayloadSize = Math.min(
                                    maxPayloadSize,
                                    packet.arg1
                                );
                                resolver.resolve(decodeUtf8(packet.payload));
                                break;
                            case AdbCommand.Auth: {
                                const response = await authProcessor.process(
                                    packet
                                );
                                await sendPacket(response);
                                break;
                            }
                            default:
                                // Maybe the previous ADB client exited without reading all packets,
                                // so they are still waiting in OS internal buffer.
                                // Just ignore them.
                                // Because a `Connect` packet will reset the device,
                                // Eventually there will be `Connect` and `Auth` response packets.
                                break;
                        }
                    },
                }),
                {
                    // Don't cancel the source ReadableStream on AbortSignal abort.
                    preventCancel: true,
                    signal: abortController.signal,
                }
            )
            .catch((e) => {
                resolver.reject(e);
            });

        const writer = connection.writable.getWriter();
        async function sendPacket(init: AdbPacketData) {
            // Always send checksum in auth steps
            // Because we don't know if the device needs it or not.
            (init as AdbPacketInit).checksum = calculateChecksum(init.payload);
            (init as AdbPacketInit).magic = init.command ^ 0xffffffff;
            await ConsumableWritableStream.write(writer, init as AdbPacketInit);
        }

        let banner: string;
        try {
            // https://android.googlesource.com/platform/packages/modules/adb/+/79010dc6d5ca7490c493df800d4421730f5466ca/transport.cpp#1252
            // There are some other feature constants, but some of them are only used by ADB server, not devices (daemons).
            const features = [
                AdbFeature.ShellV2,
                AdbFeature.Cmd,
                AdbFeature.StatV2,
                AdbFeature.ListV2,
                AdbFeature.FixedPushMkdir,
                "apex",
                AdbFeature.Abb,
                // only tells the client the symlink timestamp issue in `adb push --sync` has been fixed.
                // No special handling required.
                "fixed_push_symlink_timestamp",
                AdbFeature.AbbExec,
                "remount_shell",
                "track_app",
                "sendrecv_v2",
                "sendrecv_v2_brotli",
                "sendrecv_v2_lz4",
                "sendrecv_v2_zstd",
                "sendrecv_v2_dry_run_send",
            ].join(",");

            await sendPacket({
                command: AdbCommand.Connect,
                arg0: version,
                arg1: maxPayloadSize,
                // The terminating `;` is required in formal definition
                // But ADB daemon (all versions) can still work without it
                payload: encodeUtf8(`host::features=${features};`),
            });

            banner = await resolver.promise;
        } finally {
            // When failed, release locks on `connection` so the caller can try again.
            // When success, also release locks so `AdbPacketDispatcher` can use them.
            abortController.abort();
            writer.releaseLock();

            // Wait until pipe stops (`ReadableStream` lock released)
            await pipe;
        }

        return new Adb(connection, version, maxPayloadSize, banner);
    }

    private readonly dispatcher: AdbPacketDispatcher;

    public get disconnected() {
        return this.dispatcher.disconnected;
    }

    private _protocolVersion: number;
    public get protocolVersion() {
        return this._protocolVersion;
    }

    private _maxPayloadSize: number;
    public get maxPayloadSize() {
        return this._maxPayloadSize;
    }

    private _product: string | undefined;
    public get product() {
        return this._product;
    }

    private _model: string | undefined;
    public get model() {
        return this._model;
    }

    private _device: string | undefined;
    public get device() {
        return this._device;
    }

    private _features: AdbFeature[] = [];
    public get features() {
        return this._features;
    }

    public readonly subprocess: AdbSubprocess;
    public readonly power: AdbPower;
    public readonly reverse: AdbReverseCommand;
    public readonly tcpip: AdbTcpIpCommand;

    public constructor(
        connection: ReadableWritablePair<
            AdbPacketData,
            Consumable<AdbPacketInit>
        >,
        version: number,
        maxPayloadSize: number,
        banner: string
    ) {
        this.parseBanner(banner);

        let calculateChecksum: boolean;
        let appendNullToServiceString: boolean;
        if (version >= VERSION_OMIT_CHECKSUM) {
            calculateChecksum = false;
            appendNullToServiceString = false;
        } else {
            calculateChecksum = true;
            appendNullToServiceString = true;
        }

        this.dispatcher = new AdbPacketDispatcher(connection, {
            calculateChecksum,
            appendNullToServiceString,
            maxPayloadSize,
        });

        this._protocolVersion = version;
        this._maxPayloadSize = maxPayloadSize;

        this.subprocess = new AdbSubprocess(this);
        this.power = new AdbPower(this);
        this.reverse = new AdbReverseCommand(this);
        this.tcpip = new AdbTcpIpCommand(this);
    }

    private parseBanner(banner: string): void {
        const pieces = banner.split("::");
        if (pieces.length > 1) {
            const props = pieces[1]!;
            for (const prop of props.split(";")) {
                if (!prop) {
                    continue;
                }

                const keyValue = prop.split("=");
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
                        this._features = value!.split(",") as AdbFeature[];
                        break;
                }
            }
        }
    }

    public supportsFeature(feature: AdbFeature): boolean {
        return this._features.includes(feature);
    }

    /**
     * Add a handler for incoming socket.
     * @param handler A function to call with new incoming sockets. It must return `true` if it accepts the socket.
     * @returns A function to remove the handler.
     */
    public onIncomingSocket(handler: AdbIncomingSocketHandler) {
        return this.dispatcher.onIncomingSocket(handler);
    }

    public async createSocket(service: string): Promise<AdbSocket> {
        return this.dispatcher.createSocket(service);
    }

    public async createSocketAndWait(service: string): Promise<string> {
        const socket = await this.createSocket(service);
        const gatherStream = new GatherStringStream();
        await socket.readable
            .pipeThrough(new DecodeUtf8Stream())
            .pipeTo(gatherStream);
        return gatherStream.result;
    }

    public async getProp(key: string): Promise<string> {
        const stdout = await this.subprocess.spawnAndWaitLegacy([
            "getprop",
            key,
        ]);
        return stdout.trim();
    }

    public async rm(...filenames: string[]): Promise<string> {
        // https://android.googlesource.com/platform/packages/modules/adb/+/1a0fb8846d4e6b671c8aa7f137a8c21d7b248716/client/adb_install.cpp#984
        const stdout = await this.subprocess.spawnAndWaitLegacy([
            "rm",
            ...filenames.map((arg) => escapeArg(arg)),
            "</dev/null",
        ]);
        return stdout;
    }

    public async sync(): Promise<AdbSync> {
        const socket = await this.createSocket("sync:");
        return new AdbSync(this, socket);
    }

    public async framebuffer(): Promise<AdbFrameBuffer> {
        return framebuffer(this);
    }

    /**
     * Close the ADB connection.
     *
     * Note that it won't close the streams from backends.
     * The streams are both physically and logically intact,
     * and can be reused.
     */
    public async close(): Promise<void> {
        await this.dispatcher.close();
    }
}
