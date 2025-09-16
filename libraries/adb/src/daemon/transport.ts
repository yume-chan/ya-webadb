import type { MaybePromiseLike } from "@yume-chan/async";
import { PromiseResolver } from "@yume-chan/async";
import type { ReadableWritablePair } from "@yume-chan/stream-extra";
import {
    AbortController,
    Consumable,
    WritableStream,
} from "@yume-chan/stream-extra";
import { decodeUtf8, encodeUtf8 } from "@yume-chan/struct";

import type {
    AdbIncomingSocketHandler,
    AdbSocket,
    AdbTransport,
} from "../adb.js";
import { AdbBanner } from "../banner.js";
import { AdbDeviceFeatures, AdbFeature } from "../features.js";

import type {
    AdbAuthenticator,
    AdbCredentialStore,
    AdbKeyInfo,
} from "./auth.js";
import { AdbDefaultAuthenticator } from "./auth.js";
import { AdbPacketDispatcher } from "./dispatcher.js";
import type { AdbPacketData, AdbPacketInit } from "./packet.js";
import { AdbCommand, calculateChecksum } from "./packet.js";

export const ADB_DAEMON_VERSION_OMIT_CHECKSUM = 0x01000001;
export const ADB_DAEMON_DEFAULT_INITIAL_PAYLOAD_SIZE = 32 * 1024 * 1024;

export type AdbDaemonConnection = ReadableWritablePair<
    AdbPacketData,
    Consumable<AdbPacketInit>
>;

export interface AdbDaemonAuthenticationOptions {
    serial: string;
    connection: AdbDaemonConnection;
    features?: readonly AdbFeature[];

    /**
     * The number of bytes the device can send before receiving an ack packet.
     * Using delayed ack can improve the throughput,
     * especially when the device is connected over Wi-Fi (so the latency is higher).
     *
     * Set to 0 or any negative value to disable delayed ack in handshake.
     * Otherwise the value must be in the range of unsigned 32-bit integer.
     *
     * Delayed ack was added in Android 14,
     * this option will be ignored when the device doesn't support it.
     *
     * @default ADB_DAEMON_DEFAULT_INITIAL_PAYLOAD_SIZE
     */
    initialDelayedAckBytes?: number;

    /**
     * Whether to keep the `connection` open (don't call `writable.close` and `readable.cancel`)
     * when `AdbDaemonTransport.close` is called.
     *
     * Note that when `authenticate` fails,
     * no matter which value this option has,
     * the `connection` is always kept open, so it can be used in another `authenticate` call.
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
     * On Android 14 and newer, the Delayed Acknowledgement feature is added to
     * improve performance, especially for high-latency connections like ADB over Wi-Fi.
     *
     * When `features` doesn't include `AdbFeature.DelayedAck`, it must be set to 0. Otherwise,
     * the value must be in the range of unsigned 32-bit integer.
     *
     * If the device enabled delayed ack but the client didn't, the device will throw an error
     * when the client sends the first data packet. And vice versa.
     */
    initialDelayedAckBytes: number;

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
    /**
     * Authenticate with the ADB Daemon and create a new transport.
     */
    static async authenticate({
        serial,
        connection,
        features = AdbDeviceFeatures,
        initialDelayedAckBytes = ADB_DAEMON_DEFAULT_INITIAL_PAYLOAD_SIZE,
        ...options
    }: AdbDaemonAuthenticationOptions &
        (
            | { authenticator: AdbAuthenticator }
            | {
                  credentialStore: AdbCredentialStore;
                  onKeyLoadError?: ((error: Error) => void) | undefined;
                  onSignatureAuthentication?:
                      | ((key: AdbKeyInfo) => void)
                      | undefined;
                  onSignatureRejected?: ((key: AdbKeyInfo) => void) | undefined;
                  onPublicKeyAuthentication?:
                      | ((key: AdbKeyInfo) => void)
                      | undefined;
              }
        )): Promise<AdbDaemonTransport> {
        // Initially, set to highest-supported version and payload size.
        let version = 0x01000001;
        // Android 4: 4K, Android 7: 256K, Android 9: 1M
        let maxPayloadSize = 1024 * 1024;

        const resolver = new PromiseResolver<string>();
        let authenticator: AdbAuthenticator;
        if ("authenticator" in options) {
            authenticator = options.authenticator;
        } else {
            const defaultAuthenticator = new AdbDefaultAuthenticator(
                options.credentialStore,
            );
            if (options.onKeyLoadError) {
                defaultAuthenticator.onKeyLoadError(options.onKeyLoadError);
            }
            if (options.onSignatureAuthentication) {
                defaultAuthenticator.onSignatureAuthentication(
                    options.onSignatureAuthentication,
                );
            }
            if (options.onSignatureRejected) {
                defaultAuthenticator.onSignatureRejected(
                    options.onSignatureRejected,
                );
            }
            if (options.onPublicKeyAuthentication) {
                defaultAuthenticator.onPublicKeyAuthentication(
                    options.onPublicKeyAuthentication,
                );
            }
            authenticator = defaultAuthenticator;
        }

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
                                await sendPacket(
                                    await authenticator.authenticate(packet),
                                );
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
                async () => {
                    await authenticator.close?.();

                    // If `resolver` is already settled, call `reject` won't do anything.
                    resolver.reject(
                        new Error("Connection closed unexpectedly"),
                    );
                },
                async (e) => {
                    await authenticator.close?.();

                    resolver.reject(e);
                },
            );

        const writer = connection.writable.getWriter();
        async function sendPacket(init: AdbPacketData) {
            // Always send checksum in auth steps
            // Because we don't know if the device needs it or not.
            (init as AdbPacketInit).checksum = calculateChecksum(init.payload);
            (init as AdbPacketInit).magic = init.command ^ 0xffffffff;
            await Consumable.WritableStream.write(
                writer,
                init as AdbPacketInit,
            );
        }

        if (initialDelayedAckBytes <= 0) {
            const index = features.indexOf(AdbFeature.DelayedAck);
            if (index !== -1) {
                features = features.toSpliced(index, 1);
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
                payload: encodeUtf8(`host::features=${features.join(",")}`),
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
            features,
            initialDelayedAckBytes,
            preserveConnection: options.preserveConnection,
            readTimeLimit: options.readTimeLimit,
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
        features = AdbDeviceFeatures,
        initialDelayedAckBytes,
        ...options
    }: AdbDaemonSocketConnectorConstructionOptions) {
        this.#serial = serial;
        this.#connection = connection;
        this.#banner = AdbBanner.parse(banner);
        this.#clientFeatures = features;

        if (features.includes(AdbFeature.DelayedAck)) {
            if (initialDelayedAckBytes <= 0) {
                throw new TypeError(
                    "`initialDelayedAckBytes` must be greater than 0 when DelayedAck feature is enabled.",
                );
            }

            if (!this.#banner.features.includes(AdbFeature.DelayedAck)) {
                initialDelayedAckBytes = 0;
            }
        } else {
            initialDelayedAckBytes = 0;
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
