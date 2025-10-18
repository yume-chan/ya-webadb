import type { MaybePromiseLike } from "@yume-chan/async";
import type { Consumable, ReadableWritablePair } from "@yume-chan/stream-extra";

import type {
    AdbIncomingSocketHandler,
    AdbSocket,
    AdbTransport,
} from "../adb.js";
import { AdbBanner } from "../banner.js";
import { AdbDeviceFeatures, AdbFeature } from "../features.js";

import { AdbPacketDispatcher } from "./dispatcher.js";
import type { AdbPacketData, AdbPacketInit } from "./packet.js";

export const ADB_DAEMON_VERSION_OMIT_CHECKSUM = 0x01000001;
export const ADB_DAEMON_DEFAULT_INITIAL_PAYLOAD_SIZE = 32 * 1024 * 1024;

export type AdbDaemonConnection = ReadableWritablePair<
    AdbPacketData,
    Consumable<AdbPacketInit>
>;

export interface AdbDaemonTransportInit {
    serial: string;
    connection: AdbDaemonConnection;
    version: number;
    maxPayloadSize: number;
    banner: string;
    features?: readonly AdbFeature[];

    /**
     * The number of bytes the device can send before receiving an ack packet.
     *
     * Android 14 added the Delayed Acknowledgement feature to improve performance,
     * especially for high-latency connections like ADB over Wi-Fi.
     *
     * Whether the feature is enabled is negotiated in the handshake process
     * using the {@linkcode AdbFeature.DelayedAck} feature.
     * If the feature is enabled, this parameter must be set to a positive integer.
     *
     * If not specified, the default value is {@linkcode ADB_DAEMON_DEFAULT_INITIAL_PAYLOAD_SIZE}.
     */
    initialDelayedAckBytes?: number | undefined;

    /**
     * Whether to keep the `connection` open (don't call `writable.close` and `readable.cancel`)
     * when `AdbDaemonTransport.close` is called.
     *
     * @default false
     */
    preserveConnection?: boolean | undefined;

    /**
     * When set, the transport will throw an error when
     * one of the socket readable stalls for this amount of milliseconds.
     *
     * Because ADB is a multiplexed protocol, blocking one socket will also block all other sockets.
     * It's important to always read from all sockets to prevent stalling.
     *
     * This option is helpful to detect bugs in the client code.
     *
     * @default undefined
     */
    readTimeLimit?: number | undefined;
}

/**
 * An ADB Transport that connects to ADB Daemons directly.
 */
export class AdbDaemonTransport implements AdbTransport {
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
        features = AdbDeviceFeatures,
        initialDelayedAckBytes = ADB_DAEMON_DEFAULT_INITIAL_PAYLOAD_SIZE,
        ...options
    }: AdbDaemonTransportInit) {
        this.#serial = serial;
        this.#connection = connection;
        this.#banner = AdbBanner.parse(banner);
        this.#clientFeatures = features;

        if (
            !this.#banner.features.includes(AdbFeature.DelayedAck) ||
            !features.includes(AdbFeature.DelayedAck)
        ) {
            // For `AdbPacketDispatcher`, 0 means disabled
            initialDelayedAckBytes = 0;
        } else if (initialDelayedAckBytes <= 0) {
            // Delayed Ack is enabled in handshake process, we can't disable it here,
            // so it must be a positive integer
            throw new TypeError(
                "`initialDelayedAckBytes` must be greater than 0 when DelayedAck feature is enabled.",
            );
        }

        let shouldCalculateChecksum: boolean;
        let shouldAppendNullToServiceString: boolean;
        if (version >= ADB_DAEMON_VERSION_OMIT_CHECKSUM) {
            shouldCalculateChecksum = false;
            shouldAppendNullToServiceString = false;
        } else {
            shouldCalculateChecksum = true;
            shouldAppendNullToServiceString = true;
        }

        this.#dispatcher = new AdbPacketDispatcher(connection, {
            calculateChecksum: shouldCalculateChecksum,
            appendNullToServiceString: shouldAppendNullToServiceString,
            initialDelayedAckBytes,
            ...options,
        });

        this.#protocolVersion = version;
    }

    connect(service: string): MaybePromiseLike<AdbSocket> {
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

    close(): MaybePromiseLike<void> {
        return this.#dispatcher.close();
    }
}
