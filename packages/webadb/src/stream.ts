import AsyncOperationManager, { PromiseResolver } from '@yume-chan/async-operation-manager';
import { AutoDisposable, Disposable, Event, EventEmitter } from '@yume-chan/event';
import { decode } from './decode';
import { AdbPacket } from './packet';
import { WebAdbTransportation } from './transportation';
import { AdbCommand } from './webadb';

class AutoResetEvent {
    private _list: PromiseResolver<void>[] = [];

    private _blocking: boolean = false;

    public wait(): Promise<void> {
        if (!this._blocking) {
            this._blocking = true;

            if (this._list.length === 0) {
                return Promise.resolve();
            }
        }

        const resolver = new PromiseResolver<void>();
        this._list.push(resolver);
        return resolver.promise;
    }

    public notify() {
        if (this._list.length !== 0) {
            this._list.pop()!.resolve();
        } else {
            this._blocking = false;
        }
    }
}

export class AdbStreamController extends AutoDisposable {
    private dispatcher: AdbStreamDispatcher;

    private writeLock = new AutoResetEvent();

    private _localId: number;
    public get localId() { return this._localId; }

    private _remoteId: number;
    public get remoteId() { return this._remoteId; }

    public onDataEvent = this.addDisposable(new EventEmitter<ArrayBuffer>());

    public onCloseEvent = this.addDisposable(new EventEmitter<void>());

    public constructor(localId: number, remoteId: number, dispatcher: AdbStreamDispatcher) {
        super();

        this._localId = localId;
        this._remoteId = remoteId;
        this.dispatcher = dispatcher;
        dispatcher.addStreamController(this);
    }

    public async write(data: ArrayBuffer): Promise<void> {
        await this.writeLock.wait();
        await this.dispatcher.sendPacket(new AdbPacket(AdbCommand.Write, this.localId, this.remoteId, data));
    }

    public ack() {
        this.writeLock.notify();
    }

    public close() {
        return this.dispatcher.sendPacket(new AdbPacket(AdbCommand.Close, this.localId, this.remoteId));
    }
}

export interface OnAdbPacketEventArgs {
    handled: boolean;

    packet: AdbPacket;
}

export class AdbStreamDispatcher implements Disposable {
    private transportation: WebAdbTransportation;

    // ADB requires stream id to start from 1
    // (0 means open failed)
    private initializers = new AsyncOperationManager(1);
    private streams = new Map<number, AdbStreamController>();

    private onPacketEvent = new EventEmitter<OnAdbPacketEventArgs>();
    public get onPacket() { return this.onPacketEvent.event; }

    private _running = true;
    public get running() { return this._running; }

    public constructor(transportation: WebAdbTransportation) {
        this.transportation = transportation;
        this.receiveLoop();
    }

    public async createStream(payload: string): Promise<AdbStream> {
        const [localId, initializer] = this.initializers.add<number>();
        await this.sendPacket(new AdbPacket(AdbCommand.Open, localId, 0, payload));

        const remoteId = await initializer;
        return new AdbStream(localId, remoteId, this);
    }

    public addStreamController(controller: AdbStreamController) {
        this.streams.set(controller.localId, controller);
    }

    public sendPacket(packet: AdbPacket): Promise<void> {
        return packet.writeTo(this.transportation);
    }

    public async dispose() {
        this._running = false;

        for (const stream of this.streams.values()) {
            // await this.sendPacket(new AdbPacket(AdbCommand.Close, stream.remoteId, stream.localId));
            stream.onCloseEvent.fire();
            stream.dispose();
        }
        this.streams.clear();
    }

    private async receivePacket() {
        const header = await this.transportation.read(24);
        const packet = AdbPacket.parse(header);

        if (packet.payloadLength !== 0) {
            packet.payload = await this.transportation.read(packet.payloadLength);
        }

        return packet;
    }

    private async receiveLoop() {
        while (this._running) {
            try {
                const packet = await this.receivePacket();
                let handled = false;
                switch (packet.command) {
                    case AdbCommand.OK:
                        handled = true;
                        // OKAY has two meanings
                        if (this.initializers.resolve(packet.arg1, packet.arg0)) {
                            // 1. The device has created the Stream
                        } else if (this.streams.has(packet.arg1)) {
                            // 2. The device has received last WRTE to the Stream
                            this.streams.get(packet.arg1)!.ack();
                        } else {
                            // Last connection sent an OPEN to device,
                            // device now sent OKAY to this connection
                            // tell the device to close the stream
                            this.sendPacket(new AdbPacket(AdbCommand.Close, packet.arg1, packet.arg0));
                        }
                        break;
                    case AdbCommand.Close:
                        // CLSE also has two meanings
                        if (packet.arg0 === 0) {
                            // 1. The device don't want to create the Stream
                            if (this.initializers.reject(packet.arg1, new Error('open failed'))) {
                                handled = true;
                            }
                        } else if (this.streams.has(packet.arg1)) {
                            // 2. The device has closed the Stream
                            const stream = this.streams.get(packet.arg1)!;
                            stream.onCloseEvent.fire();
                            stream.dispose();

                            this.streams.delete(packet.arg1);
                            handled = true;
                        }
                        break;
                    case AdbCommand.Write:
                        if (this.streams.has(packet.arg1)) {
                            this.streams.get(packet.arg1)!.onDataEvent.fire(packet.payload!);
                            await this.sendPacket(new AdbPacket(AdbCommand.OK, packet.arg1, packet.arg0));
                            handled = true;
                        }
                        break;
                }

                if (!handled) {
                    const args: OnAdbPacketEventArgs = {
                        handled: false,
                        packet,
                    }
                    this.onPacketEvent.fire(args);
                    if (!args.handled) {
                        this.dispose();
                        return;
                    }
                }
            } catch (e) {
                if (!this._running) {
                    // ignore error
                }

                throw e;
            }
        }
    }
}

export class AdbStream {
    private controller: AdbStreamController;

    public get localId() { return this.controller.localId; }

    public get remoteId() { return this.controller.remoteId; }

    public get onData(): Event<ArrayBuffer> { return this.controller.onDataEvent.event; }

    public get onClose(): Event<void> { return this.controller.onCloseEvent.event; }

    public constructor(localId: number, remoteId: number, dispatcher: AdbStreamDispatcher) {
        this.controller = new AdbStreamController(localId, remoteId, dispatcher);
    }

    public async readAll(): Promise<string> {
        const resolver = new PromiseResolver<string>();
        let output = '';
        this.onData((data) => {
            output += decode(data);
        });
        this.onClose(() => {
            resolver.resolve(output);
        });
        return resolver.promise;
    }

    public write(data: ArrayBuffer): Promise<void> {
        return this.controller.write(data);
    }

    public close(): Promise<void> {
        return this.controller.close();
    }
}
