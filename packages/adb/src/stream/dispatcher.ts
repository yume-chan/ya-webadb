import AsyncOperationManager from '@yume-chan/async-operation-manager';
import { AutoDisposable, EventEmitter } from '@yume-chan/event';
import { AdbBackend } from '../backend';
import { AdbCommand, AdbPacket, AdbPacketInit } from '../packet';
import { AutoResetEvent } from '../utils';
import { AdbStreamController } from './controller';
import { AdbStream } from './stream';

export interface AdbPacketReceivedEventArgs {
    handled: boolean;

    packet: AdbPacket;
}

export interface AdbIncomingStreamEventArgs {
    handled: boolean;

    packet: AdbPacket;

    stream: AdbStream;
}

export class AdbPacketDispatcher extends AutoDisposable {
    // ADB requires stream id to start from 1
    // (0 means open failed)
    private readonly initializers = new AsyncOperationManager(1);
    private readonly streams = new Map<number, AdbStreamController>();
    private readonly sendLock = new AutoResetEvent();

    public readonly backend: AdbBackend;

    public maxPayloadSize = 0;
    public calculateChecksum = true;
    public appendNullToServiceString = true;

    private readonly packetEvent = this.addDisposable(new EventEmitter<AdbPacketReceivedEventArgs>());
    public get onPacket() { return this.packetEvent.event; }

    private readonly streamEvent = this.addDisposable(new EventEmitter<AdbIncomingStreamEventArgs>());
    public get onStream() { return this.streamEvent.event; }

    private readonly errorEvent = this.addDisposable(new EventEmitter<Error>());
    public get onError() { return this.errorEvent.event; }

    private _running = false;
    public get running() { return this._running; }

    public constructor(backend: AdbBackend) {
        super();

        this.backend = backend;
    }

    private async receiveLoop() {
        try {
            while (this._running) {
                const packet = await AdbPacket.read(this.backend);
                switch (packet.command) {
                    case AdbCommand.OK:
                        this.handleOk(packet);
                        continue;
                    case AdbCommand.Close:
                        // CLSE also has two meanings
                        if (packet.arg0 === 0) {
                            // 1. The device don't want to create the Stream
                            this.initializers.reject(packet.arg1, new Error('Stream open failed'));
                            continue;
                        }

                        if (this.streams.has(packet.arg1)) {
                            // 2. The device has closed the Stream
                            this.streams.get(packet.arg1)!.dispose();
                            this.streams.delete(packet.arg1);
                            continue;
                        }

                        // Maybe the device is responding to a packet of last connection
                        // Just ignore it
                        continue;
                    case AdbCommand.Write:
                        if (this.streams.has(packet.arg1)) {
                            await this.streams.get(packet.arg1)!.dataEvent.fire(packet.payload!);
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
                    return;
                }
            }
        } catch (e) {
            if (!this._running) {
                // ignore error
                return;
            }

            this.errorEvent.fire(e);
        }
    }

    private handleOk(packet: AdbPacket) {
        if (this.initializers.resolve(packet.arg1, packet.arg0)) {
            // Device has created the `Stream`
            return;
        }

        if (this.streams.has(packet.arg1)) {
            // Device has received last `WRTE` to the `Stream`
            this.streams.get(packet.arg1)!.ack();
            return;
        }

        // Maybe the device is responding to a packet of last connection
        // Tell the device to close the stream
        this.sendPacket(AdbCommand.Close, packet.arg1, packet.arg0);
    }

    private async handleOpen(packet: AdbPacket) {
        // AsyncOperationManager doesn't support get and skip an ID
        // Use `add` + `resolve` to simulate the behavior
        const [localId] = this.initializers.add<number>();
        this.initializers.resolve(localId, undefined);

        const remoteId = packet.arg0;
        const controller = new AdbStreamController(localId, remoteId, this);
        const stream = new AdbStream(controller);

        const args: AdbIncomingStreamEventArgs = {
            handled: false,
            packet,
            stream,
        };
        this.streamEvent.fire(args);

        if (args.handled) {
            this.streams.set(localId, controller);
            await this.sendPacket(AdbCommand.OK, localId, remoteId);
        } else {
            await this.sendPacket(AdbCommand.Close, 0, remoteId);
        }
    }

    public start() {
        this._running = true;
        this.receiveLoop();
    }

    public async createStream(service: string): Promise<AdbStream> {
        if (this.appendNullToServiceString) {
            service += '\0';
        }

        const [localId, initializer] = this.initializers.add<number>();
        await this.sendPacket(AdbCommand.Open, localId, 0, service);

        const remoteId = await initializer;
        const controller = new AdbStreamController(localId, remoteId, this);
        this.streams.set(controller.localId, controller);

        return new AdbStream(controller);
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
        payload?: string | ArrayBuffer
    ): Promise<void> {
        let init: AdbPacketInit;
        if (arguments.length === 1) {
            init = packetOrCommand as AdbPacketInit;
        } else {
            init = {
                command: packetOrCommand as AdbCommand,
                arg0: arg0 as number,
                arg1: arg1 as number,
                payload: typeof payload === 'string' ? this.backend.encodeUtf8(payload) : payload,
            };
        }

        if (init.payload &&
            init.payload.byteLength > this.maxPayloadSize) {
            throw new Error('payload too large');
        }

        try {
            await this.sendLock.wait();

            const packet = AdbPacket.create(init, this.calculateChecksum, this.backend);
            await AdbPacket.write(packet, this.backend);
        } finally {
            this.sendLock.notify();
        }
    }

    public dispose() {
        this._running = false;

        for (const stream of this.streams.values()) {
            stream.dispose();
        }
        this.streams.clear();

        super.dispose();
    }
}
