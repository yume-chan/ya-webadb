import {
    AsyncOperationManager,
    PromiseResolver,
    delay,
} from "@yume-chan/async";
import {
    getUint32LittleEndian,
    setUint32LittleEndian,
} from "@yume-chan/no-data-view";
import type {
    ReadableWritablePair,
    WritableStreamDefaultController,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import {
    AbortController,
    Consumable,
    WritableStream,
} from "@yume-chan/stream-extra";
import { EmptyUint8Array, decodeUtf8, encodeUtf8 } from "@yume-chan/struct";

import type { AdbIncomingSocketHandler, AdbSocket, Closeable } from "../adb.js";

import type { AdbPacketData, AdbPacketInit } from "./packet.js";
import { AdbCommand, calculateChecksum } from "./packet.js";
import { AdbDaemonSocketController } from "./socket.js";

export interface AdbPacketDispatcherOptions {
    /**
     * From Android 9.0, ADB stopped checking the checksum in packet header to improve performance.
     *
     * The value should be inferred from the device's ADB protocol version.
     */
    calculateChecksum: boolean;

    /**
     * Before Android 9.0, ADB uses `char*` to parse service strings,
     * thus requires a null character to terminate.
     *
     * The value should be inferred from the device's ADB protocol version.
     * Usually it should have the same value as `calculateChecksum`, since they both changed
     * in Android 9.0.
     */
    appendNullToServiceString: boolean;

    maxPayloadSize: number;

    /**
     * Whether to keep the `connection` open (don't call `writable.close` and `readable.cancel`)
     * when `AdbPacketDispatcher.close` is called.
     *
     * @default false
     */
    preserveConnection?: boolean | undefined;

    /**
     * The number of bytes the device can send before receiving an ack packet.
     * Using delayed ack can improve the throughput,
     * especially when the device is connected over Wi-Fi (so the latency is higher).
     *
     * This must be the negotiated value between the client and device. If the device enabled
     * delayed ack but the client didn't, the device will throw an error when the client sends
     * the first `WRTE` packet. And vice versa.
     */
    initialDelayedAckBytes: number;

    /**
     * When set, the dispatcher will throw an error when
     * one of the socket readable stalls for this amount of milliseconds.
     *
     * Because ADB is a multiplexed protocol, blocking one socket will also block all other sockets.
     * It's important to always read from all sockets to prevent stalling.
     *
     * This option is helpful to detect bugs in the client code.
     *
     * @default false
     */
    readTimeLimit?: number | undefined;
}

interface SocketOpenResult {
    remoteId: number;
    availableWriteBytes: number;
}

/**
 * The dispatcher is the "dumb" part of the connection handling logic.
 *
 * Except some options to change some minor behaviors,
 * its only job is forwarding packets between authenticated underlying streams
 * and abstracted socket objects.
 *
 * The `Adb` class is responsible for doing the authentication,
 * negotiating the options, and has shortcuts to high-level services.
 */
export class AdbPacketDispatcher implements Closeable {
    // ADB socket id starts from 1
    // (0 means open failed)
    readonly #initializers = new AsyncOperationManager(1);
    /**
     * Socket local ID to the socket controller.
     */
    readonly #sockets = new Map<number, AdbDaemonSocketController>();

    readonly #writer: WritableStreamDefaultWriter<Consumable<AdbPacketInit>>;

    readonly options: AdbPacketDispatcherOptions;

    #closed = false;
    readonly #disconnected = new PromiseResolver<void>();
    get disconnected() {
        return this.#disconnected.promise;
    }

    readonly #incomingSocketHandlers = new Map<
        string,
        AdbIncomingSocketHandler
    >();
    readonly #readAbortController = new AbortController();

    constructor(
        connection: ReadableWritablePair<
            AdbPacketData,
            Consumable<AdbPacketInit>
        >,
        options: AdbPacketDispatcherOptions,
    ) {
        this.options = options;
        // Don't allow negative values in dispatcher
        if (this.options.initialDelayedAckBytes < 0) {
            this.options.initialDelayedAckBytes = 0;
        }

        connection.readable
            .pipeTo(
                new WritableStream<AdbPacketData>({
                    write: async (
                        packet: AdbPacketData,
                        controller: WritableStreamDefaultController,
                    ) => {
                        switch (packet.command) {
                            case AdbCommand.Close:
                                await this.#handleClose(packet);
                                break;
                            case AdbCommand.Okay:
                                this.#handleOkay(packet);
                                break;
                            case AdbCommand.Open:
                                await this.#handleOpen(packet);
                                break;
                            case AdbCommand.Write:
                                // Don't await - let each socket handle its own backpressure
                                // without blocking other sockets' packet processing.
                                // Fatal errors are propagated via WritableStream's controller.
                                this.#handleWrite(packet).catch((e) => {
                                    controller.error(e);
                                });
                                break;
                            default:
                                // Junk data may only appear in the authentication phase,
                                // since the dispatcher only works after authentication,
                                // all packets should have a valid command.
                                // (although it's possible that Adb added new commands in the future)
                                throw new Error(
                                    `Unknown command: ${packet.command.toString(
                                        16,
                                    )}`,
                                );
                        }
                    },
                }),
                {
                    preventCancel: options.preserveConnection ?? false,
                    signal: this.#readAbortController.signal,
                },
            )
            .then(
                () => {
                    this.#dispose();
                },
                (e) => {
                    if (!this.#closed) {
                        this.#disconnected.reject(e);
                    }
                    this.#dispose();
                },
            );

        this.#writer = connection.writable.getWriter();
    }

    async #handleClose(packet: AdbPacketData) {
        // If the socket is still pending
        if (
            packet.arg0 === 0 &&
            this.#initializers.reject(
                packet.arg1,
                new Error("Socket open failed"),
            )
        ) {
            // Device failed to create the socket
            // (unknown service string, failed to execute command, etc.)
            // it doesn't break the connection,
            // so only reject the socket creation promise,
            // don't throw an error here.
            return;
        }

        // From https://android.googlesource.com/platform/packages/modules/adb/+/65d18e2c1cc48b585811954892311b28a4c3d188/adb.cpp#459
        /* According to protocol.txt, p->msg.arg0 might be 0 to indicate
         * a failed OPEN only. However, due to a bug in previous ADB
         * versions, CLOSE(0, remote-id, "") was also used for normal
         * CLOSE() operations.
         */

        // Ignore `arg0` and search for the socket
        const socket = this.#sockets.get(packet.arg1);
        if (socket) {
            await socket.close();
            socket.dispose();
            this.#sockets.delete(packet.arg1);
            return;
        }

        // TODO: adb: is double closing an socket a catastrophic error?
        // If the client sends two `CLSE` packets for one socket,
        // the device may also respond with two `CLSE` packets.
    }

    #handleOkay(packet: AdbPacketData) {
        let ackBytes: number;
        if (this.options.initialDelayedAckBytes !== 0) {
            if (packet.payload.length !== 4) {
                throw new Error(
                    "Invalid OKAY packet. Payload size should be 4",
                );
            }
            ackBytes = getUint32LittleEndian(packet.payload, 0);
        } else {
            if (packet.payload.length !== 0) {
                throw new Error(
                    "Invalid OKAY packet. Payload size should be 0",
                );
            }
            ackBytes = Infinity;
        }

        if (
            this.#initializers.resolve(packet.arg1, {
                remoteId: packet.arg0,
                availableWriteBytes: ackBytes,
            } satisfies SocketOpenResult)
        ) {
            // Device successfully created the socket
            return;
        }

        const socket = this.#sockets.get(packet.arg1);
        if (socket) {
            // When delayed ack is enabled, `ackBytes` is a positive number represents
            // how many bytes the device has received from this socket.
            // When delayed ack is disabled, `ackBytes` is always `Infinity` represents
            // the device has received last `WRTE` packet from the socket.
            socket.ack(ackBytes);
            return;
        }

        // Maybe the device is responding to a packet of last connection
        // Tell the device to close the socket
        void this.sendPacket(
            AdbCommand.Close,
            packet.arg1,
            packet.arg0,
            EmptyUint8Array,
        );
    }

    #sendOkay(localId: number, remoteId: number, ackBytes: number) {
        let payload: Uint8Array;
        if (this.options.initialDelayedAckBytes !== 0) {
            // TODO: try reusing this buffer to reduce memory allocation
            // However, that requires blocking reentrance of `sendOkay`, which might be more expensive
            payload = new Uint8Array(4);
            setUint32LittleEndian(payload, 0, ackBytes);
        } else {
            payload = EmptyUint8Array;
        }

        return this.sendPacket(AdbCommand.Okay, localId, remoteId, payload);
    }

    async #handleOpen(packet: AdbPacketData) {
        // Allocate a local ID for the socket from `#initializers`.
        // `AsyncOperationManager` doesn't directly support returning the next ID,
        // so use `add` + `resolve` to simulate this
        const [localId] = this.#initializers.add<number>();
        this.#initializers.resolve(localId, undefined);

        const remoteId = packet.arg0;
        let availableWriteBytes = packet.arg1;
        let service = decodeUtf8(packet.payload);
        // ADB Daemon still adds a null character to the service string
        if (service.endsWith("\0")) {
            service = service.substring(0, service.length - 1);
        }

        // Check remote delayed ack enablement is consistent with local
        if (this.options.initialDelayedAckBytes === 0) {
            if (availableWriteBytes !== 0) {
                throw new Error("Invalid OPEN packet. arg1 should be 0");
            }
            availableWriteBytes = Infinity;
        } else {
            if (availableWriteBytes === 0) {
                throw new Error(
                    "Invalid OPEN packet. arg1 should be greater than 0",
                );
            }
        }

        const handler = this.#incomingSocketHandlers.get(service);
        if (!handler) {
            await this.sendPacket(
                AdbCommand.Close,
                0,
                remoteId,
                EmptyUint8Array,
            );
            return;
        }

        const controller = new AdbDaemonSocketController({
            dispatcher: this,
            localId,
            remoteId,
            localCreated: false,
            service,
            availableWriteBytes,
        });

        try {
            await handler(controller.socket);
            this.#sockets.set(localId, controller);
            await this.#sendOkay(
                localId,
                remoteId,
                this.options.initialDelayedAckBytes,
            );
        } catch {
            await this.sendPacket(
                AdbCommand.Close,
                0,
                remoteId,
                EmptyUint8Array,
            );
        }
    }

    async #handleWrite(packet: AdbPacketData) {
        const socket = this.#sockets.get(packet.arg1);
        if (!socket) {
            throw new Error(`Unknown local socket id: ${packet.arg1}`);
        }

        let handled = false;

        const promises: Promise<void>[] = [
            (async () => {
                await socket.enqueue(packet.payload);
                await this.#sendOkay(
                    packet.arg1,
                    packet.arg0,
                    packet.payload.length,
                );
                handled = true;
            })(),
        ];

        if (this.options.readTimeLimit) {
            promises.push(
                (async () => {
                    await delay(this.options.readTimeLimit!);
                    if (!handled) {
                        throw new Error(
                            `readable of \`${socket.service}\` has stalled for ${this.options.readTimeLimit} milliseconds`,
                        );
                    }
                })(),
            );
        }

        await Promise.race(promises);
    }

    async createSocket(service: string): Promise<AdbSocket> {
        if (this.options.appendNullToServiceString) {
            service += "\0";
        }

        const [localId, initializer] =
            this.#initializers.add<SocketOpenResult>();
        await this.sendPacket(
            AdbCommand.Open,
            localId,
            this.options.initialDelayedAckBytes,
            service,
        );

        // Fulfilled by `handleOkay`
        const { remoteId, availableWriteBytes } = await initializer;
        const controller = new AdbDaemonSocketController({
            dispatcher: this,
            localId,
            remoteId,
            localCreated: true,
            service,
            availableWriteBytes,
        });
        this.#sockets.set(localId, controller);

        return controller.socket;
    }

    addReverseTunnel(service: string, handler: AdbIncomingSocketHandler) {
        this.#incomingSocketHandlers.set(service, handler);
    }

    removeReverseTunnel(address: string) {
        this.#incomingSocketHandlers.delete(address);
    }

    clearReverseTunnels() {
        this.#incomingSocketHandlers.clear();
    }

    async sendPacket(
        command: AdbCommand,
        arg0: number,
        arg1: number,
        // PERF: It's slightly faster to not use default parameter values
        payload: string | Uint8Array,
    ): Promise<void> {
        if (typeof payload === "string") {
            payload = encodeUtf8(payload);
        }

        if (payload.length > this.options.maxPayloadSize) {
            throw new TypeError("payload too large");
        }

        await Consumable.WritableStream.write(this.#writer, {
            command,
            arg0,
            arg1,
            payload,
            checksum: this.options.calculateChecksum
                ? calculateChecksum(payload)
                : 0,
            magic: command ^ 0xffffffff,
        });
    }

    async close() {
        // Send `CLSE` packets for all sockets
        await Promise.all(
            Array.from(this.#sockets.values(), (socket) => socket.close()),
        );

        // Stop receiving
        // It's possible that we haven't received all `CLSE` confirm packets,
        // but it doesn't matter, the next connection can cope with them.
        this.#closed = true;

        this.#readAbortController.abort();
        if (this.options.preserveConnection) {
            this.#writer.releaseLock();
        } else {
            await this.#writer.close();
        }

        // `pipe().then()` will call `dispose`
    }

    #dispose() {
        for (const socket of this.#sockets.values()) {
            socket.dispose();
        }

        this.#disconnected.resolve();
    }
}
