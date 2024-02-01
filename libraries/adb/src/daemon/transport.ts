import { PromiseResolver } from "@yume-chan/async";
import type { Consumable, ReadableWritablePair } from "@yume-chan/stream-extra";
import {
    AbortController,
    ConsumableWritableStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import type { ValueOrPromise } from "@yume-chan/struct";
import { decodeUtf8, encodeUtf8 } from "@yume-chan/struct";

import type {
    AdbIncomingSocketHandler,
    AdbSocket,
    AdbTransport,
} from "../adb.js";
import { AdbBanner } from "../banner.js";
import { AdbFeature } from "../features.js";

import type { AdbAuthenticator, AdbCredentialStore } from "./auth.js";
import {
    ADB_DEFAULT_AUTHENTICATORS,
    AdbAuthenticationProcessor,
} from "./auth.js";
import { AdbPacketDispatcher } from "./dispatcher.js";
import type { AdbPacketData, AdbPacketInit } from "./packet.js";
import { AdbCommand, calculateChecksum } from "./packet.js";

export const ADB_DAEMON_VERSION_OMIT_CHECKSUM = 0x01000001;
// https://android.googlesource.com/platform/packages/modules/adb/+/79010dc6d5ca7490c493df800d4421730f5466ca/transport.cpp#1252
// There are some other feature constants, but some of them are only used by ADB server, not devices (daemons).
export const ADB_DAEMON_DEFAULT_FEATURES = [
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
    AdbFeature.SendReceiveV2,
    "sendrecv_v2_brotli",
    "sendrecv_v2_lz4",
    "sendrecv_v2_zstd",
    "sendrecv_v2_dry_run_send",
    AdbFeature.DelayedAck,
] as AdbFeature[];
export const ADB_DAEMON_DEFAULT_INITIAL_PAYLOAD_SIZE = 32 * 1024 * 1024;

export type AdbDaemonConnection = ReadableWritablePair<
    AdbPacketData,
    Consumable<AdbPacketInit>
>;

interface AdbDaemonAuthenticationOptions {
    serial: string;
    connection: AdbDaemonConnection;
    credentialStore: AdbCredentialStore;
    authenticators?: AdbAuthenticator[];
    features?: readonly AdbFeature[];
    /**
     * The number of bytes the device can send before receiving an ack packet.
     *
     * Set to 0 or any negative value to disable delayed ack in handshake.
     * Otherwise the value must be in the range of unsigned 32-bit integer.
     *
     * Delayed ack requires Android 14, this option is ignored on older versions.
     */
    initialDelayedAckBytes?: number;
    /**
     * Whether to preserve the connection open after the `AdbDaemonTransport` is closed.
     */
    preserveConnection?: boolean | undefined;
    debugSlowRead?: boolean | undefined;
}

interface AdbDaemonSocketConnectorConstructionOptions {
    serial: string;
    connection: AdbDaemonConnection;
    version: number;
    maxPayloadSize: number;
    banner: string;
    features?: readonly AdbFeature[];
    /**
     * The number of bytes the device can send before receiving an ack packet.
     *
     * Set to 0 or any negative value to disable delayed ack in handshake.
     * Otherwise the value must be in the range of unsigned 32-bit integer.
     *
     * Delayed ack requires Android 14, this option is ignored on older versions.
     */
    initialDelayedAckBytes?: number;
    /**
     * Whether to preserve the connection open after the `AdbDaemonTransport` is closed.
     */
    preserveConnection?: boolean | undefined;
    debugSlowRead?: boolean | undefined;
}

export class AdbDaemonTransport implements AdbTransport {
    /**
     * Authenticates the connection and creates an `AdbDaemonTransport` instance
     * that can be used by `Adb` class.
     *
     * If an authentication process failed, it's possible to call `authenticate` again
     * on the same connection. Because every time the device receives a `CNXN` packet,
     * it resets all internal state, and starts a new authentication process.
     */
    static async authenticate({
        serial,
        connection,
        credentialStore,
        authenticators = ADB_DEFAULT_AUTHENTICATORS,
        features = ADB_DAEMON_DEFAULT_FEATURES,
        initialDelayedAckBytes = ADB_DAEMON_DEFAULT_INITIAL_PAYLOAD_SIZE,
        ...options
    }: AdbDaemonAuthenticationOptions): Promise<AdbDaemonTransport> {
        // Initially, set to highest-supported version and payload size.
        let version = 0x01000001;
        // Android 4: 4K, Android 7: 256K, Android 9: 1M
        let maxPayloadSize = 1024 * 1024;

        const resolver = new PromiseResolver<string>();
        const authProcessor = new AdbAuthenticationProcessor(
            authenticators,
            credentialStore,
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
                                    packet.arg1,
                                );
                                resolver.resolve(decodeUtf8(packet.payload));
                                break;
                            case AdbCommand.Auth: {
                                const response =
                                    await authProcessor.process(packet);
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
                },
            )
            .then(
                () => {
                    if (resolver.state === "running") {
                        resolver.reject(
                            new Error("Connection closed unexpectedly"),
                        );
                    }
                },
                (e) => {
                    resolver.reject(e);
                },
            );

        const writer = connection.writable.getWriter();
        async function sendPacket(init: AdbPacketData) {
            // Always send checksum in auth steps
            // Because we don't know if the device needs it or not.
            (init as AdbPacketInit).checksum = calculateChecksum(init.payload);
            (init as AdbPacketInit).magic = init.command ^ 0xffffffff;
            await ConsumableWritableStream.write(writer, init as AdbPacketInit);
        }

        const actualFeatures = features.slice();
        if (initialDelayedAckBytes <= 0) {
            const index = features.indexOf(AdbFeature.DelayedAck);
            if (index !== -1) {
                actualFeatures.splice(index, 1);
            }
        }

        let banner: string;
        try {
            await sendPacket({
                command: AdbCommand.Connect,
                arg0: version,
                arg1: maxPayloadSize,
                // The terminating `;` is required in formal definition
                // But ADB daemon (all versions) can still work without it
                payload: encodeUtf8(
                    `host::features=${actualFeatures.join(",")}`,
                ),
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

        return new AdbDaemonTransport({
            serial,
            connection,
            version,
            maxPayloadSize,
            banner,
            features: actualFeatures,
            initialDelayedAckBytes,
            ...options,
        });
    }

    #connection: AdbDaemonConnection;
    get connection() {
        return this.#connection;
    }

    readonly #dispatcher: AdbPacketDispatcher;

    #serial: string;
    get serial() {
        return this.#serial;
    }

    #protocolVersion: number;
    get protocolVersion() {
        return this.#protocolVersion;
    }

    get maxPayloadSize() {
        return this.#dispatcher.options.maxPayloadSize;
    }

    #banner: AdbBanner;
    get banner() {
        return this.#banner;
    }

    get disconnected() {
        return this.#dispatcher.disconnected;
    }

    #clientFeatures: readonly AdbFeature[];
    get clientFeatures() {
        return this.#clientFeatures;
    }

    constructor({
        serial,
        connection,
        version,
        banner,
        features = ADB_DAEMON_DEFAULT_FEATURES,
        initialDelayedAckBytes = ADB_DAEMON_DEFAULT_INITIAL_PAYLOAD_SIZE,
        ...options
    }: AdbDaemonSocketConnectorConstructionOptions) {
        this.#serial = serial;
        this.#connection = connection;
        this.#banner = AdbBanner.parse(banner);
        this.#clientFeatures = features;

        if (features.includes(AdbFeature.DelayedAck)) {
            if (initialDelayedAckBytes <= 0) {
                throw new Error(
                    "`initialDelayedAckBytes` must be greater than 0 when DelayedAck feature is enabled.",
                );
            }

            if (!this.#banner.features.includes(AdbFeature.DelayedAck)) {
                initialDelayedAckBytes = 0;
            }
        } else {
            initialDelayedAckBytes = 0;
        }

        let calculateChecksum: boolean;
        let appendNullToServiceString: boolean;
        if (version >= ADB_DAEMON_VERSION_OMIT_CHECKSUM) {
            calculateChecksum = false;
            appendNullToServiceString = false;
        } else {
            calculateChecksum = true;
            appendNullToServiceString = true;
        }

        this.#dispatcher = new AdbPacketDispatcher(connection, {
            calculateChecksum,
            appendNullToServiceString,
            initialDelayedAckBytes,
            ...options,
        });

        this.#protocolVersion = version;
    }

    connect(service: string): ValueOrPromise<AdbSocket> {
        return this.#dispatcher.createSocket(service);
    }

    addReverseTunnel(
        handler: AdbIncomingSocketHandler,
        address?: string,
    ): string {
        if (!address) {
            const id = Math.random().toString().substring(2);
            address = `localabstract:reverse_${id}`;
        }
        this.#dispatcher.addReverseTunnel(address, handler);
        return address;
    }

    removeReverseTunnel(address: string): void {
        this.#dispatcher.removeReverseTunnel(address);
    }

    clearReverseTunnels(): void {
        this.#dispatcher.clearReverseTunnels();
    }

    close(): ValueOrPromise<void> {
        return this.#dispatcher.close();
    }
}
