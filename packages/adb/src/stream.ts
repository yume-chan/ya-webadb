import AsyncOperationManager, { PromiseResolver } from '@yume-chan/async-operation-manager';
import { AutoDisposable, Disposable, Event, EventEmitter } from '@yume-chan/event';
import { AdbPacket } from './packet';
import { AdbBackend } from './backend';
import { AdbCommand } from './packet';

class AutoResetEvent implements Disposable {
    private readonly list: PromiseResolver<void>[] = [];

    private blocking: boolean = false;

    public wait(): Promise<void> {
        if (!this.blocking) {
            this.blocking = true;

            if (this.list.length === 0) {
                return Promise.resolve();
            }
        }

        const resolver = new PromiseResolver<void>();
        this.list.push(resolver);
        return resolver.promise;
    }

    public notify() {
        if (this.list.length !== 0) {
            this.list.pop()!.resolve();
        } else {
            this.blocking = false;
        }
    }

    public dispose() {
        for (const item of this.list) {
            item.reject(new Error('The AutoResetEvent has been disposed'));
        }
        this.list.length = 0;
    }
}

export class AdbStreamController extends AutoDisposable {
    private readonly writeLock = this.addDisposable(new AutoResetEvent());

    public readonly dispatcher: AdbPacketDispatcher;

    public readonly localId: number;

    public readonly remoteId: number;

    public readonly onDataEvent = this.addDisposable(new EventEmitter<ArrayBuffer>());

    public readonly onCloseEvent = this.addDisposable(new EventEmitter<void>());

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

    private readonly onPacketEvent = this.addDisposable(new EventEmitter<AdbPacketArrivedEventArgs>());
    public readonly onPacket = this.onPacketEvent.event;

    private readonly onReceiveErrorEvent = this.addDisposable(new EventEmitter<Error>());
    public readonly onReceiveError = this.onReceiveErrorEvent.event;

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

    public async dispose() {
        this._running = false;

        for (const stream of this.streams.values()) {
            // await this.sendPacket(new AdbPacket(AdbCommand.Close, stream.remoteId, stream.localId));
            stream.onCloseEvent.fire();
            stream.dispose();
        }
        this.streams.clear();

        super.dispose();
    }

    private async receiveLoop() {
        while (this._running) {
            try {
                const packet = await AdbPacket.parse(this.backend);
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
                            this.sendPacket(AdbCommand.Close, packet.arg1, packet.arg0);
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
                            await this.sendPacket(AdbCommand.OK, packet.arg1, packet.arg0);
                            handled = true;
                        }
                        break;
                }

                if (!handled) {
                    const args: AdbPacketArrivedEventArgs = {
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

                this.onReceiveErrorEvent.fire(e);
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

    public constructor(controller: AdbStreamController) {
        this.controller = controller;
    }

    public async readAll(): Promise<string> {
        const resolver = new PromiseResolver<string>();
        let output = '';
        this.onData((data) => {
            output += this.controller.dispatcher.backend.decodeUtf8(data);
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
