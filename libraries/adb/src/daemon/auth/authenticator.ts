import type { MaybePromiseLike } from "@yume-chan/async";
import { PromiseResolver } from "@yume-chan/async";
import type { WritableStreamDefaultWriter } from "@yume-chan/stream-extra";
import {
    AbortController,
    Consumable,
    WritableStream,
} from "@yume-chan/stream-extra";
import { decodeUtf8, encodeUtf8 } from "@yume-chan/struct";

import { AdbDeviceFeatures, AdbFeature } from "../../features.js";
import type { AdbPacketData, AdbPacketInit } from "../packet.js";
import { AdbCommand, calculateChecksum } from "../packet.js";
import type { AdbDaemonTransportInit } from "../transport.js";
import {
    ADB_DAEMON_DEFAULT_INITIAL_PAYLOAD_SIZE,
    AdbDaemonTransport,
} from "../transport.js";

import type { AdbDaemonAuthProcessorInit } from "./packet-processor.js";
import { AdbDaemonAuthProcessor } from "./packet-processor.js";

export type AdbDaemonAuthenticateOptions = Pick<
    AdbDaemonTransportInit,
    | "serial"
    | "connection"
    | "features"
    | "initialDelayedAckBytes"
    | "preserveConnection"
    | "readTimeLimit"
> &
    AdbDaemonAuthProcessorInit;

export interface IAdbDaemonAuthProcessor {
    process(packet: AdbPacketData): Promise<AdbPacketData>;

    close?(): MaybePromiseLike<undefined>;
}

export class AdbDaemonAuthenticator {
    static #instance: AdbDaemonAuthenticator | undefined;

    /**
     * Authenticates an `AdbDaemonConnection` using a shared `AdbDaemonAuthenticator` instance.
     *
     * @param options Authentication options
     * @returns An authenticated `AdbDaemonTransport` instance
     */
    static authenticate(options: AdbDaemonAuthenticateOptions) {
        if (!this.#instance) {
            this.#instance = new AdbDaemonAuthenticator();
        }
        return this.#instance.authenticate(options);
    }

    #sendPacket(
        writer: WritableStreamDefaultWriter<Consumable<AdbPacketInit>>,
        init: AdbPacketData,
    ): Promise<void>;
    // Use an overload to convert `init` to `AdbPacketInit`
    #sendPacket(
        writer: WritableStreamDefaultWriter<Consumable<AdbPacketInit>>,
        init: AdbPacketInit,
    ) {
        // Always send checksum in auth steps
        // Because we don't know if the device needs it or not.
        init.checksum = calculateChecksum(init.payload);
        init.magic = init.command ^ 0xffffffff;
        return Consumable.WritableStream.write(writer, init);
    }

    /**
     * Create an `AdbDaemonAuthenticationProcessor` instance to handle one auth process.
     *
     * @param init Options for `AdbDaemonAuthenticationProcessor`
     * @returns An `AdbDaemonAuthenticationProcessor` instance
     */
    createProcessor(init: AdbDaemonAuthProcessorInit): IAdbDaemonAuthProcessor {
        return new AdbDaemonAuthProcessor(init);
    }

    async authenticate({
        serial,
        connection,
        features = AdbDeviceFeatures,
        initialDelayedAckBytes = ADB_DAEMON_DEFAULT_INITIAL_PAYLOAD_SIZE,
        preserveConnection,
        readTimeLimit,
        ...processorInit
    }: AdbDaemonAuthenticateOptions): Promise<AdbDaemonTransport> {
        const processor = this.createProcessor(processorInit);

        // Initially, set to highest-supported version and payload size.
        let version = 0x01000001;
        // Android 4: 4K, Android 7: 256K, Android 9: 1M
        let maxPayloadSize = 1024 * 1024;

        const resolver = new PromiseResolver<string>();

        const abortController = new AbortController();

        const writer = connection.writable.getWriter();

        const pipe = connection.readable
            .pipeTo(
                new WritableStream({
                    write: async (packet) => {
                        // Here is similar to `AdbPacketDispatcher`,
                        // But the received packet types and send packet processing are different.
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
                                await this.#sendPacket(
                                    writer,
                                    await processor.process(packet),
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
                    await processor.close?.();

                    // If `resolver` is already settled, call `reject` won't do anything.
                    resolver.reject(
                        new Error("Connection closed unexpectedly"),
                    );
                },
                async (e) => {
                    await processor.close?.();

                    resolver.reject(e);
                },
            );

        if (initialDelayedAckBytes <= 0) {
            const index = features.indexOf(AdbFeature.DelayedAck);
            if (index !== -1) {
                features = features.toSpliced(index, 1);
            }
        }

        let banner: string;
        try {
            await this.#sendPacket(writer, {
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
            preserveConnection,
            readTimeLimit,
        });
    }
}
