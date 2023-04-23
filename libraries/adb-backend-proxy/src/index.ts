import type {
    Adb,
    AdbBackend,
    AdbPacketData,
    AdbPacketInit,
    AdbSocket,
} from "@yume-chan/adb";
import { AdbCommand, decodeUtf8 } from "@yume-chan/adb";
import { PromiseResolver } from "@yume-chan/async";
import type { Consumable, ReadableWritablePair } from "@yume-chan/stream-extra";
import {
    ConsumableWritableStream,
    DuplexStreamFactory,
    ReadableStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import { EMPTY_UINT8_ARRAY, encodeUtf8 } from "@yume-chan/struct";

const NOOP = () => {
    // no-op
};

interface AdbProxyServerSocket {
    socket: AdbSocket;
    writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>;
    pendingRead?: PromiseResolver<void>;
}

export interface AdbProxyServerHandle {
    port: MessagePort;
    version: number;
    maxPayloadSize: number;
    banner: string;
    close(): Promise<void>;
}

export class AdbProxyServer {
    private _adb: Adb;

    private _pendingSockets = new Map<number, PromiseResolver<boolean>>();

    private _ports: Set<MessagePort> = new Set();

    constructor(adb: Adb) {
        this._adb = adb;
        this._adb.onIncomingSocket(async (socket) => {
            for (const port of this._ports) {
                const promiseResolver = new PromiseResolver<boolean>();
                this._pendingSockets.set(socket.remoteId, promiseResolver);
                port.postMessage({
                    command: AdbCommand.Open,
                    arg0: 0,
                    arg1: socket.remoteId,
                    payload: encodeUtf8(socket.serviceString),
                } satisfies AdbPacketData);
                if (await promiseResolver.promise) {
                    return true;
                }
            }
            return false;
        });
        this._adb.disconnected.then(() => {
            for (const port of this._ports) {
                port.postMessage({
                    command: AdbCommand.Close,
                    arg0: 0,
                    arg1: 0,
                    payload: EMPTY_UINT8_ARRAY,
                } satisfies AdbPacketData);
                port.close();
            }
        }, NOOP);
    }

    public createPort(): AdbProxyServerHandle {
        const channel = new MessageChannel();
        const port = channel.port1;
        this._ports.add(port);

        const sockets = new Map<number, AdbProxyServerSocket>();
        port.onmessage = async (e) => {
            const data = e.data as AdbPacketData;
            switch (data.command) {
                case AdbCommand.Auth:
                    throw new Error(`Can't send AUTH packet through proxy`);
                case AdbCommand.Connect:
                    throw new Error(`Can't send CNXN packet through proxy`);
                case AdbCommand.Open: {
                    if (data.arg1 !== 0) {
                        this._pendingSockets.get(data.arg1)?.resolve(true);
                        break;
                    }
                    try {
                        const socket = await this._adb.createSocket(
                            decodeUtf8(data.payload)
                        );
                        const proxySocket: AdbProxyServerSocket = {
                            socket,
                            writer: socket.writable.getWriter(),
                        };
                        socket.readable
                            .pipeTo(
                                new WritableStream({
                                    write(chunk) {
                                        proxySocket.pendingRead =
                                            new PromiseResolver<void>();
                                        port.postMessage({
                                            command: AdbCommand.Write,
                                            arg0: 1,
                                            arg1: data.arg0,
                                            payload: chunk,
                                        } satisfies AdbPacketData);
                                    },
                                })
                            )
                            .then(() => {
                                port.postMessage({
                                    command: AdbCommand.Close,
                                    arg0: 1,
                                    arg1: data.arg0,
                                    payload: EMPTY_UINT8_ARRAY,
                                } satisfies AdbPacketData);
                            }, NOOP);
                        sockets.set(data.arg0, proxySocket);
                        port.postMessage({
                            command: AdbCommand.OK,
                            // remoteId doesn't matter
                            arg0: 1,
                            arg1: data.arg0,
                            payload: EMPTY_UINT8_ARRAY,
                        } satisfies AdbPacketData);
                    } catch {
                        port.postMessage({
                            command: AdbCommand.Close,
                            arg0: 0,
                            arg1: data.arg0,
                            payload: EMPTY_UINT8_ARRAY,
                        } satisfies AdbPacketData);
                    }
                    break;
                }
                case AdbCommand.Write: {
                    const socket = sockets.get(data.arg0);
                    if (!socket) {
                        break;
                    }
                    await ConsumableWritableStream.write(
                        socket.writer,
                        data.payload
                    );
                    port.postMessage({
                        command: AdbCommand.OK,
                        arg0: 1,
                        arg1: data.arg0,
                        payload: EMPTY_UINT8_ARRAY,
                    } satisfies AdbPacketData);
                    break;
                }
                case AdbCommand.Close: {
                    if (data.arg0 === 0) {
                        this._pendingSockets.get(data.arg1)?.resolve(false);
                        break;
                    }
                    const socket = sockets.get(data.arg0);
                    if (!socket) {
                        break;
                    }
                    await socket.writer.close();
                    sockets.delete(data.arg0);

                    port.postMessage({
                        command: AdbCommand.Close,
                        arg0: 1,
                        arg1: data.arg0,
                        payload: EMPTY_UINT8_ARRAY,
                    } satisfies AdbPacketData);
                    break;
                }
                case AdbCommand.OK: {
                    const socket = sockets.get(data.arg1);
                    if (!socket) {
                        break;
                    }
                    socket.pendingRead?.resolve();
                    break;
                }
            }
        };
        return {
            port: channel.port2,
            version: this._adb.protocolVersion,
            maxPayloadSize: this._adb.maxPayloadSize,
            banner: this._adb.banner,
            close: async () => {
                for (const socket of sockets.values()) {
                    await socket.writer.close();
                }
                port.postMessage({
                    command: AdbCommand.Connect,
                    arg0: 0,
                    arg1: 0,
                    payload: EMPTY_UINT8_ARRAY,
                } satisfies AdbPacketData);
                port.close();
                this._ports.delete(port);
            },
        };
    }
}

class AdbProxyConnection
    implements ReadableWritablePair<AdbPacketData, Consumable<AdbPacketInit>>
{
    public readable: ReadableStream<AdbPacketData>;
    public writable: WritableStream<Consumable<AdbPacketInit>>;

    public constructor(port: MessagePort) {
        const duplex = new DuplexStreamFactory<
            AdbPacketData,
            Consumable<AdbPacketInit>
        >({
            close: () => {
                port.postMessage({
                    command: AdbCommand.Connect,
                    arg0: 0,
                    arg1: 0,
                    payload: EMPTY_UINT8_ARRAY,
                } satisfies AdbPacketData);
                port.close();
            },
        });

        this.readable = duplex.wrapReadable(
            new ReadableStream({
                start(controller) {
                    port.onmessage = (e) => {
                        const data = e.data as AdbPacketData;
                        switch (data.command) {
                            case AdbCommand.Connect:
                                controller.close();
                                break;
                            default:
                                controller.enqueue(data);
                                break;
                        }
                    };
                },
            })
        );

        this.writable = duplex.createWritable(
            new WritableStream({
                write(chunk) {
                    switch (chunk.value.command) {
                        case AdbCommand.Auth:
                            throw new Error(
                                `Can't send AUTH packet through proxy`
                            );
                        case AdbCommand.Connect:
                            throw new Error(
                                `Can't send CNXN packet through proxy`
                            );
                        case AdbCommand.Open:
                            port.postMessage(
                                chunk.value satisfies AdbPacketData
                            );
                            break;
                        case AdbCommand.Close:
                            port.postMessage(
                                chunk.value satisfies AdbPacketData
                            );
                            break;
                        case AdbCommand.OK:
                            port.postMessage(
                                chunk.value satisfies AdbPacketData
                            );
                            break;
                        case AdbCommand.Write: {
                            // Can't transfer `chunk.payload`, will break clients
                            port.postMessage(
                                chunk.value satisfies AdbPacketData
                            );
                            break;
                        }
                    }
                    chunk.consume();
                },
            })
        );
    }
}

export default class AdbProxyBackend implements AdbBackend {
    public static isSupported(): boolean {
        return true;
    }

    private readonly port: MessagePort;

    public readonly serial: string;

    public name: string | undefined;

    public constructor(port: MessagePort, name?: string) {
        this.port = port;
        this.serial = `proxy`;
        this.name = name;
    }

    public connect() {
        return new AdbProxyConnection(this.port);
    }
}
