import type { Adb, AdbPacketData, AdbSocket } from "@yume-chan/adb";
import { AdbCommand } from "@yume-chan/adb";
import { PromiseResolver } from "@yume-chan/async";
import { AutoDisposable, EventEmitter } from "@yume-chan/event";
import type {
    Consumable,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import {
    ConsumableWritableStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import { EMPTY_UINT8_ARRAY, decodeUtf8, encodeUtf8 } from "@yume-chan/struct";

const NOOP = () => {
    // no-op
};

class AdbProxyServerSocket {
    public handle: AdbProxyServerConnection;
    public localId: number;
    public pendingRead?: PromiseResolver<void>;

    private _writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>;

    public constructor(
        handle: AdbProxyServerConnection,
        socket: AdbSocket,
        localId: number
    ) {
        this.handle = handle;
        this.localId = localId;
        this._writer = socket.writable.getWriter();

        socket.readable
            .pipeTo(
                new WritableStream({
                    write: this.handleData.bind(this),
                })
            )
            .finally(this.handleClose.bind(this));
    }

    /**
     * Handle data from server
     */
    private async handleData(payload: Uint8Array) {
        const promiseResolver = new PromiseResolver<void>();
        this.pendingRead = promiseResolver;
        this.handle.postMessage(AdbCommand.Write, 1, this.localId, payload);
        await promiseResolver.promise;
    }

    /**
     * Handle close from server
     */
    private handleClose() {
        this.handle.postMessage(AdbCommand.Close, 1, this.localId);
    }

    /**
     * Write data to server
     */
    public async write(payload: Uint8Array) {
        await ConsumableWritableStream.write(this._writer, payload);
    }

    /**
     * Send close to server
     */
    public async close() {
        await this._writer.close();
    }
}

export interface AdbProxyServerInfo {
    port: MessagePort;
    version: number;
    maxPayloadSize: number;
    banner: string;
}

class AdbProxyServerConnection {
    public adb: Adb;
    public port: MessagePort;

    private _closed = new EventEmitter<void>();
    public get closed() {
        return this._closed.event;
    }

    private _pendingSockets = new Map<number, PromiseResolver<boolean>>();
    private _sockets = new Map<number, AdbProxyServerSocket>();

    public constructor(adb: Adb, port: MessagePort) {
        this.adb = adb;
        this.port = port;
        port.onmessage = this.handleMessage.bind(this);
    }

    /**
     * Handle messages from client
     */
    private async handleMessage(e: MessageEvent) {
        const data = e.data as AdbPacketData;
        switch (data.command) {
            case AdbCommand.Auth:
                throw new Error(`Can't send AUTH packet through proxy`);
            case AdbCommand.Connect:
                throw new Error(`Can't send CNXN packet through proxy`);
            case AdbCommand.Open:
                await this.handleOpen(data);
                break;
            case AdbCommand.Write: {
                const socket = this._sockets.get(data.arg0);
                if (!socket) {
                    break;
                }
                await socket.write(data.payload);
                this.postMessage(AdbCommand.OK, 1, data.arg0);
                break;
            }
            case AdbCommand.Close: {
                if (data.arg0 === 0) {
                    this._pendingSockets.get(data.arg1)?.resolve(false);
                    break;
                }
                const socket = this._sockets.get(data.arg0);
                if (!socket) {
                    break;
                }
                await socket.close();
                this._sockets.delete(data.arg0);

                this.postMessage(AdbCommand.Close, 1, data.arg0);
                break;
            }
            case AdbCommand.OK: {
                const socket = this._sockets.get(data.arg1);
                if (!socket) {
                    break;
                }
                socket.pendingRead?.resolve();
                break;
            }
        }
    }

    /**
     * Handle open from client
     */
    private async handleOpen(data: AdbPacketData) {
        if (data.arg1 !== 0) {
            this._pendingSockets.get(data.arg1)?.resolve(true);
            return;
        }

        const localId = data.arg0;
        try {
            const service = decodeUtf8(data.payload);
            const socket = await this.adb.createSocket(service);
            this._sockets.set(
                localId,
                new AdbProxyServerSocket(this, socket, localId)
            );
            // remoteId doesn't matter
            this.postMessage(AdbCommand.OK, 1, localId);
        } catch {
            this.postMessage(AdbCommand.Close, 0, localId);
        }
    }

    /**
     * Send message to client
     */
    public postMessage(
        command: AdbCommand,
        arg0: number,
        arg1: number,
        payload = EMPTY_UINT8_ARRAY
    ) {
        this.port.postMessage({
            command,
            arg0,
            arg1,
            payload,
        } satisfies AdbPacketData);
    }

    /**
     * Wait for client to accept the incoming socket
     */
    public async waitOpenResult(remoteId: number) {
        const promiseResolver = new PromiseResolver<boolean>();
        this._pendingSockets.set(remoteId, promiseResolver);
        return promiseResolver.promise;
    }

    /**
     * Close the connection to both client and server
     */
    public async close(): Promise<void> {
        for (const socket of this._sockets.values()) {
            await socket.close();
        }

        this.postMessage(AdbCommand.Connect, 0, 0);
        this.port.close();

        this._closed.fire();
    }
}

export class AdbProxyServer extends AutoDisposable {
    private _adb: Adb;

    private _ports: Set<AdbProxyServerConnection> = new Set();

    constructor(adb: Adb) {
        super();

        this._adb = adb;

        this.addDisposable(
            this._adb.onIncomingSocket(async (socket) => {
                for (const port of this._ports) {
                    port.postMessage(
                        AdbCommand.Open,
                        0,
                        socket.remoteId,
                        encodeUtf8(socket.serviceString)
                    );
                    if (await port.waitOpenResult(socket.remoteId)) {
                        return true;
                    }
                }
                return false;
            })
        );

        this._adb.disconnected.then(async () => {
            for (const port of this._ports) {
                // CNXN means disconnected
                port.postMessage(AdbCommand.Connect, 0, 0);
                await port.close();
            }
        }, NOOP);
    }

    /**
     * Create a port that can be used to create a client
     */
    public createPort(): AdbProxyServerInfo {
        const channel = new MessageChannel();
        const port = new AdbProxyServerConnection(this._adb, channel.port1);
        this._ports.add(port);
        port.closed(() => {
            this._ports.delete(port);
        });
        return {
            port: channel.port2,
            version: this._adb.protocolVersion,
            maxPayloadSize: this._adb.maxPayloadSize,
            banner: this._adb.banner,
        };
    }
}
