import AsyncOperationManager from '@yume-chan/async-operation-manager';
import { AsyncEventEmitter, AutoDisposable, EventEmitter } from '@yume-chan/event';
import { AdbBackend } from './backend';
import { AdbCommand, AdbPacket } from './packet';
import { AutoResetEvent } from './utils';

export class AdbStreamController extends AutoDisposable {
    private readonly writeLock = this.addDisposable(new AutoResetEvent());

    public readonly dispatcher: AdbPacketDispatcher;

    public get backend() { return this.dispatcher.backend; }

    public readonly localId: number;

    public readonly remoteId: number;

    public readonly dataEvent = this.addDisposable(new AsyncEventEmitter<ArrayBuffer>());

    private readonly closeEvent = this.addDisposable(new EventEmitter<void>());

    public get onClose() { return this.closeEvent.event; }

    public constructor(localId: number, remoteId: number, dispatcher: AdbPacketDispatcher) {
        super();

        this.localId = localId;
        this.remoteId = remoteId;
        this.dispatcher = dispatcher;
    }

    public async write(data: ArrayBuffer): Promise<void> {
        await this.writeLock.wait();
        await this.dispatcher.sendPacket(AdbCommand.Write, this.localId, this.remoteId, data);
    }

    public ack() {
        this.writeLock.notify();
    }

    public close() {
        return this.dispatcher.sendPacket(AdbCommand.Close, this.localId, this.remoteId);
    }

    public dispose() {
        this.closeEvent.fire();
        super.dispose();
    }
}

export interface AdbPacketArrivedEventArgs {
    handled: boolean;

    packet: AdbPacket;
}

export class AdbPacketDispatcher extends AutoDisposable {
    public readonly backend: AdbBackend;

    // ADB requires stream id to start from 1
    // (0 means open failed)
    private readonly initializers = new AsyncOperationManager(1);
    private readonly streams = new Map<number, AdbStreamController>();

    private readonly packetEvent = this.addDisposable(new EventEmitter<AdbPacketArrivedEventArgs>());
    public get onPacket() { return this.packetEvent.event; }

    private readonly errorEvent = this.addDisposable(new EventEmitter<Error>());
    public get onError() { return this.errorEvent.event; }

    private _running = true;
    public get running() { return this._running; }

    public constructor(backend: AdbBackend) {
        super();

        this.backend = backend;
        this.receiveLoop();
    }

    public async createStream(service: string): Promise<AdbStream> {
        const [localId, initializer] = this.initializers.add<number>();
        await this.sendPacket(AdbCommand.Open, localId, 0, service);

        const remoteId = await initializer;
        const controller = new AdbStreamController(localId, remoteId, this);
        this.streams.set(controller.localId, controller);

        return new AdbStream(controller);
    }

    public sendPacket(packet: AdbPacket): Promise<void>;
    public sendPacket(
        command: AdbCommand,
        arg0: number,
        arg1: number,
        payload?: string | ArrayBuffer
    ): Promise<void>;
    public sendPacket(
        packetOrCommand: AdbPacket | AdbCommand,
        arg0?: number,
        arg1?: number,
        payload?: string | ArrayBuffer
    ): Promise<void> {
        if (arguments.length === 1) {
            return (packetOrCommand as AdbPacket).send();
        } else {
            return AdbPacket.send(
                this.backend,
                packetOrCommand as AdbCommand,
                arg0 as number,
                arg1 as number,
                payload
            );
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

    private async receiveLoop() {
        try {
            while (this._running) {
                const packet = await AdbPacket.parse(this.backend);
                switch (packet.command) {
                    case AdbCommand.OK:
                        // OKAY has two meanings
                        if (this.initializers.resolve(packet.arg1, packet.arg0)) {
                            // 1. The device has created the Stream
                            continue;
                        }

                        if (this.streams.has(packet.arg1)) {
                            // 2. The device has received last WRTE to the Stream
                            this.streams.get(packet.arg1)!.ack();
                            continue;
                        }

                        // Maybe the device is responding to a packet of last connection
                        // Tell the device to close the stream
                        this.sendPacket(AdbCommand.Close, packet.arg1, packet.arg0);
                        continue;
                    case AdbCommand.Close:
                        // CLSE also has two meanings
                        if (packet.arg0 === 0) {
                            // 1. The device don't want to create the Stream
                            this.initializers.reject(packet.arg1, new Error('open failed'));
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
                }

                const args: AdbPacketArrivedEventArgs = {
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
}

export class AdbStream {
    private controller: AdbStreamController;

    public get backend() { return this.controller.backend; }

    public get localId() { return this.controller.localId; }

    public get remoteId() { return this.controller.remoteId; }

    public get onData() { return this.controller.dataEvent.event; }

    public get onClose() { return this.controller.onClose; }

    public constructor(controller: AdbStreamController) {
        this.controller = controller;
    }

    public write(data: ArrayBuffer): Promise<void> {
        return this.controller.write(data);
    }

    public close(): Promise<void> {
        return this.controller.close();
    }
}
