import { AsyncOperationManager } from '@yume-chan/async';
import { AutoDisposable, EventEmitter } from '@yume-chan/event';
import { AdbBackend } from '../backend';
import { AdbCommand, AdbPacket, AdbPacketInit } from '../packet';
import { AutoResetEvent, decodeUtf8, encodeUtf8 } from '../utils';
import { AdbSocketController } from './controller';
import { AdbLogger } from './logger';
import { AdbSocket } from './socket';

export interface AdbPacketReceivedEventArgs {
    handled: boolean;

    packet: AdbPacket;
}

export interface AdbIncomingSocketEventArgs {
    handled: boolean;

    packet: AdbPacket;

    serviceString: string;

    socket: AdbSocket;
}

const EmptyArrayBuffer = new ArrayBuffer(0);

export class AdbPacketDispatcher extends AutoDisposable {
    // ADB socket id starts from 1
    // (0 means open failed)
    private readonly initializers = new AsyncOperationManager(1);
    private readonly sockets = new Map<number, AdbSocketController>();
    private readonly sendLock = new AutoResetEvent();
    private readonly logger: AdbLogger | undefined;

    public readonly backend: AdbBackend;

    public maxPayloadSize = 0;
    public calculateChecksum = true;
    public appendNullToServiceString = true;

    private readonly packetEvent = this.addDisposable(new EventEmitter<AdbPacketReceivedEventArgs>());
    public get onPacket() { return this.packetEvent.event; }

    private readonly incomingSocketEvent = this.addDisposable(new EventEmitter<AdbIncomingSocketEventArgs>());
    public get onIncomingSocket() { return this.incomingSocketEvent.event; }

    private readonly errorEvent = this.addDisposable(new EventEmitter<Error>());
    public get onError() { return this.errorEvent.event; }

    private _running = false;
    public get running() { return this._running; }

    public constructor(backend: AdbBackend, logger?: AdbLogger) {
        super();

        this.backend = backend;
        this.logger = logger;
    }

    private async receiveLoop() {
        try {
            while (this._running) {
                const packet = await AdbPacket.read(this.backend);
                this.logger?.onIncomingPacket?.(packet);

                switch (packet.command) {
                    case AdbCommand.OK:
                        this.handleOk(packet);
                        continue;
                    case AdbCommand.Close:
                        await this.handleClose(packet);
                        continue;
                    case AdbCommand.Write:
                        if (this.sockets.has(packet.arg1)) {
                            await this.sockets.get(packet.arg1)!.dataEvent.fire(packet.payload!);
                            await this.sendPacket(AdbCommand.OK, packet.arg1, packet.arg0);
                        }

                        // Maybe the device is responding to a packet of last connection
                        // Just ignore it
                        continue;
                    case AdbCommand.Open:
                        await this.handleOpen(packet);
                        continue;
                }

                const args: AdbPacketReceivedEventArgs = {
                    handled: false,
                    packet,
                };
                this.packetEvent.fire(args);
                if (!args.handled) {
                    this.dispose();
                    throw new Error(`Unhandled packet with command '${packet.command}'`);
                }
            }
        } catch (e) {
            if (!this._running) {
                // ignore error
                return;
            }

            this.errorEvent.fire(e as Error);
        }
    }

    private handleOk(packet: AdbPacket) {
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
        this.sendPacket(AdbCommand.Close, packet.arg1, packet.arg0);
    }

    private async handleClose(packet: AdbPacket) {
        // From https://android.googlesource.com/platform/packages/modules/adb/+/65d18e2c1cc48b585811954892311b28a4c3d188/adb.cpp#459
        /* According to protocol.txt, p->msg.arg0 might be 0 to indicate
         * a failed OPEN only. However, due to a bug in previous ADB
         * versions, CLOSE(0, remote-id, "") was also used for normal
         * CLOSE() operations.
         */

        // So don't return if `reject` didn't find a pending socket
        if (packet.arg0 === 0 &&
            this.initializers.reject(packet.arg1, new Error('Socket open failed'))) {
            // Device failed to create the socket
            return;
        }

        const socket = this.sockets.get(packet.arg1);
        if (socket) {
            // The device want to close the socket
            if (!socket.closed) {
                await this.sendPacket(AdbCommand.Close, packet.arg1, packet.arg0);
            }
            socket.dispose();
            this.sockets.delete(packet.arg1);
            return;
        }

        // Maybe the device is responding to a packet of last connection
        // Just ignore it
    }

    private async handleOpen(packet: AdbPacket) {
        // AsyncOperationManager doesn't support get and skip an ID
        // Use `add` + `resolve` to simulate this behavior
        const [localId] = this.initializers.add<number>();
        this.initializers.resolve(localId, undefined);

        const remoteId = packet.arg0;
        const serviceString = decodeUtf8(packet.payload!);

        const controller = new AdbSocketController({
            dispatcher: this,
            localId,
            remoteId,
            localCreated: false,
            serviceString,
        });
        const socket = new AdbSocket(controller);

        const args: AdbIncomingSocketEventArgs = {
            handled: false,
            packet,
            serviceString,
            socket,
        };
        this.incomingSocketEvent.fire(args);

        if (args.handled) {
            this.sockets.set(localId, controller);
            await this.sendPacket(AdbCommand.OK, localId, remoteId);
        } else {
            await this.sendPacket(AdbCommand.Close, 0, remoteId);
        }
    }

    public start() {
        this._running = true;
        this.receiveLoop();
    }

    public async createSocket(serviceString: string): Promise<AdbSocket> {
        if (this.appendNullToServiceString) {
            serviceString += '\0';
        }

        const [localId, initializer] = this.initializers.add<number>();
        await this.sendPacket(AdbCommand.Open, localId, 0, serviceString);

        const remoteId = await initializer;
        const controller = new AdbSocketController({
            dispatcher: this,
            localId,
            remoteId,
            localCreated: true,
            serviceString,
        });
        this.sockets.set(controller.localId, controller);

        return new AdbSocket(controller);
    }

    public sendPacket(packet: AdbPacketInit): Promise<void>;
    public sendPacket(
        command: AdbCommand,
        arg0: number,
        arg1: number,
        payload?: string | ArrayBuffer
    ): Promise<void>;
    public async sendPacket(
        packetOrCommand: AdbPacketInit | AdbCommand,
        arg0?: number,
        arg1?: number,
        payload: string | ArrayBuffer = EmptyArrayBuffer,
    ): Promise<void> {
        let init: AdbPacketInit;
        if (arg0 === undefined) {
            init = packetOrCommand as AdbPacketInit;
        } else {
            init = {
                command: packetOrCommand as AdbCommand,
                arg0: arg0 as number,
                arg1: arg1 as number,
                payload: typeof payload === 'string' ? encodeUtf8(payload) : payload,
            };
        }

        if (init.payload &&
            init.payload.byteLength > this.maxPayloadSize) {
            throw new Error('payload too large');
        }

        try {
            // `AdbPacket.write` writes each packet in two parts
            // Use a lock to prevent packets been interlaced
            await this.sendLock.wait();

            this.logger?.onOutgoingPacket?.(init);

            await AdbPacket.write(init, this.calculateChecksum, this.backend);
        } finally {
            this.sendLock.notify();
        }
    }

    public dispose() {
        this._running = false;

        for (const socket of this.sockets.values()) {
            socket.dispose();
        }
        this.sockets.clear();

        super.dispose();
    }
}
