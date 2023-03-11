import { AsyncOperationManager, PromiseResolver } from "@yume-chan/async";
import type { RemoveEventListener } from "@yume-chan/event";
import type {
    Consumable,
    ReadableWritablePair,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import {
    AbortController,
    ConsumableWritableStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import type { ValueOrPromise } from "@yume-chan/struct";
import { EMPTY_UINT8_ARRAY } from "@yume-chan/struct";

import type { AdbPacketData, AdbPacketInit } from "../packet.js";
import { AdbCommand, calculateChecksum } from "../packet.js";
import { decodeUtf8, encodeUtf8 } from "../utils/index.js";

import type { AdbSocket } from "./socket.js";
import { AdbSocketController } from "./socket.js";

export interface AdbPacketDispatcherOptions {
    calculateChecksum: boolean;
    /**
     * Before Android 9.0, ADB uses `char*` to parse service string,
     * thus requires a null character to terminate.
     *
     * Usually it should have the same value as `calculateChecksum`.
     */
    appendNullToServiceString: boolean;
    maxPayloadSize: number;
}

export type AdbIncomingSocketHandler = (
    socket: AdbSocket
) => ValueOrPromise<boolean>;

export interface Closeable {
    close(): ValueOrPromise<void>;
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
    private readonly initializers = new AsyncOperationManager(1);
    /**
     * Socket local ID to the socket controller.
     */
    private readonly sockets = new Map<number, AdbSocketController>();

    private _writer: WritableStreamDefaultWriter<Consumable<AdbPacketInit>>;

    public readonly options: AdbPacketDispatcherOptions;

    private _closed = false;
    private _disconnected = new PromiseResolver<void>();
    public get disconnected() {
        return this._disconnected.promise;
    }

    private _incomingSocketHandlers: Set<AdbIncomingSocketHandler> = new Set();

    private _abortController = new AbortController();

    public constructor(
        connection: ReadableWritablePair<
            AdbPacketData,
            Consumable<AdbPacketInit>
        >,
        options: AdbPacketDispatcherOptions
    ) {
        this.options = options;

        connection.readable
            .pipeTo(
                new WritableStream({
                    write: async (packet) => {
                        switch (packet.command) {
                            case AdbCommand.OK:
                                this.handleOk(packet);
                                break;
                            case AdbCommand.Close:
                                await this.handleClose(packet);
                                break;
                            case AdbCommand.Write:
                                if (this.sockets.has(packet.arg1)) {
                                    await this.sockets
                                        .get(packet.arg1)!
                                        .enqueue(packet.payload);
                                    await this.sendPacket(
                                        AdbCommand.OK,
                                        packet.arg1,
                                        packet.arg0
                                    );
                                    break;
                                }
                                throw new Error(
                                    `Unknown local socket id: ${packet.arg1}`
                                );
                            case AdbCommand.Open:
                                await this.handleOpen(packet);
                                break;
                            default:
                                // Junk data may only appear in the authentication phase,
                                // since the dispatcher only works after authentication,
                                // all packets should have a valid command.
                                // (although it's possible that Adb added new commands in the future)
                                throw new Error(
                                    `Unknown command: ${packet.command.toString(
                                        16
                                    )}`
                                );
                        }
                    },
                }),
                {
                    // There are multiple reasons for the pipe to stop,
                    // (device disconnection, protocol error, or user abortion)
                    // if the underlying streams are still open,
                    // it's still possible to create another ADB connection.
                    // So don't close `readable` here.
                    preventCancel: true,
                    signal: this._abortController.signal,
                }
            )
            .then(
                () => {
                    this.dispose();
                },
                (e) => {
                    if (!this._closed) {
                        this._disconnected.reject(e);
                    }
                    this.dispose();
                }
            );

        this._writer = connection.writable.getWriter();
    }

    private handleOk(packet: AdbPacketData) {
        if (this.initializers.resolve(packet.arg1, packet.arg0)) {
            // Device successfully created the socket
            return;
        }

        const socket = this.sockets.get(packet.arg1);
        if (socket) {
            // Device has received last `WRTE` to the socket
            socket.ack();
            return;
        }

        // Maybe the device is responding to a packet of last connection
        // Tell the device to close the socket
        void this.sendPacket(AdbCommand.Close, packet.arg1, packet.arg0);
    }

    private async handleClose(packet: AdbPacketData) {
        // If the socket is still pending
        if (
            packet.arg0 === 0 &&
            this.initializers.reject(
                packet.arg1,
                new Error("Socket open failed")
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
        const socket = this.sockets.get(packet.arg1);
        if (socket) {
            // The device want to close the socket
            if (!socket.closed) {
                await this.sendPacket(
                    AdbCommand.Close,
                    packet.arg1,
                    packet.arg0
                );
            }
            await socket.dispose();
            this.sockets.delete(packet.arg1);
            return;
        }

        // TODO: adb: is double closing an socket a catastrophic error?
        // If the client sends two `CLSE` packets for one socket,
        // the device may also respond with two `CLSE` packets.
    }

    /**
     * Add a handler for incoming socket.
     * @param handler A function to call with new incoming sockets. It must return `true` if it accepts the socket.
     * @returns A function to remove the handler.
     */
    public onIncomingSocket(
        handler: AdbIncomingSocketHandler
    ): RemoveEventListener {
        this._incomingSocketHandlers.add(handler);
        const remove = () => {
            this._incomingSocketHandlers.delete(handler);
        };
        remove.dispose = remove;
        return remove;
    }

    private async handleOpen(packet: AdbPacketData) {
        // `AsyncOperationManager` doesn't support skipping IDs
        // Use `add` + `resolve` to simulate this behavior
        const [localId] = this.initializers.add<number>();
        this.initializers.resolve(localId, undefined);

        const remoteId = packet.arg0;
        const serviceString = decodeUtf8(packet.payload);

        const controller = new AdbSocketController({
            dispatcher: this,
            localId,
            remoteId,
            localCreated: false,
            serviceString,
        });

        for (const handler of this._incomingSocketHandlers) {
            if (await handler(controller.socket)) {
                this.sockets.set(localId, controller);
                await this.sendPacket(AdbCommand.OK, localId, remoteId);
                return;
            }
        }

        await this.sendPacket(AdbCommand.Close, 0, remoteId);
    }

    public async createSocket(serviceString: string): Promise<AdbSocket> {
        if (this.options.appendNullToServiceString) {
            serviceString += "\0";
        }

        const [localId, initializer] = this.initializers.add<number>();
        await this.sendPacket(AdbCommand.Open, localId, 0, serviceString);

        // Fulfilled by `handleOk`
        const remoteId = await initializer;
        const controller = new AdbSocketController({
            dispatcher: this,
            localId,
            remoteId,
            localCreated: true,
            serviceString,
        });
        this.sockets.set(localId, controller);

        return controller.socket;
    }

    public async sendPacket(
        command: AdbCommand,
        arg0: number,
        arg1: number,
        payload: string | Uint8Array = EMPTY_UINT8_ARRAY
    ): Promise<void> {
        if (typeof payload === "string") {
            payload = encodeUtf8(payload);
        }

        if (payload.byteLength > this.options.maxPayloadSize) {
            throw new Error("payload too large");
        }

        await ConsumableWritableStream.write(this._writer, {
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

    public async close() {
        // Send `CLSE` packets for all sockets
        await Promise.all(
            Array.from(this.sockets.values(), (socket) => socket.close())
        );

        // Stop receiving
        // It's possible that we haven't received all `CLSE` confirm packets,
        // but it doesn't matter, the next connection can cope with them.
        this._closed = true;
        this._abortController.abort();
        this._writer.releaseLock();

        // `pipe().then()` will call `dispose`
    }

    private dispose() {
        for (const socket of this.sockets.values()) {
            socket.dispose().catch((e) => {
                void e;
            });
        }

        this._disconnected.resolve();
    }
}
