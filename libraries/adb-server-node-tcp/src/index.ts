import type { AddressInfo, SocketConnectOpts } from "net";
import { Server, Socket } from "net";

import type {
    AdbIncomingSocketHandler,
    AdbServerConnection,
    AdbServerConnectionOptions,
} from "@yume-chan/adb";
import type { ReadableWritablePair } from "@yume-chan/stream-extra";
import {
    PushReadableStream,
    UnwrapConsumableStream,
    WrapWritableStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import type { ValueOrPromise } from "@yume-chan/struct";

function nodeSocketToStreamPair(socket: Socket) {
    socket.setNoDelay(true);
    return {
        readable: new PushReadableStream<Uint8Array>((controller) => {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            socket.on("data", async (data) => {
                socket.pause();
                await controller.enqueue(data);
                socket.resume();
            });
            socket.on("end", () => {
                try {
                    controller.close();
                } catch (e) {
                    // controller already closed
                }
            });
            controller.abortSignal.addEventListener("abort", () => {
                socket.end();
            });
        }),
        writable: new WritableStream<Uint8Array>({
            write: async (chunk) => {
                await new Promise<void>((resolve, reject) => {
                    socket.write(chunk, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            },
            close() {
                return new Promise<void>((resolve) => {
                    socket.end(resolve);
                });
            },
        }),
    };
}

export class AdbServerNodeTcpConnection implements AdbServerConnection {
    public readonly spec: SocketConnectOpts;

    private readonly _listeners = new Map<string, Server>();

    public constructor(spec: SocketConnectOpts) {
        this.spec = spec;
    }

    public async connect(
        { unref }: AdbServerConnectionOptions = { unref: false }
    ): Promise<ReadableWritablePair<Uint8Array, Uint8Array>> {
        const socket = new Socket();
        if (unref) {
            socket.unref();
        }
        socket.connect(this.spec);
        await new Promise<void>((resolve, reject) => {
            socket.once("connect", resolve);
            socket.once("error", reject);
        });
        return nodeSocketToStreamPair(socket);
    }

    public async addReverseTunnel(
        handler: AdbIncomingSocketHandler,
        address?: string
    ): Promise<string> {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        const server = new Server(async (socket) => {
            const stream = nodeSocketToStreamPair(socket);
            try {
                await handler({
                    service: address!,
                    readable: stream.readable,
                    writable: new WrapWritableStream(
                        stream.writable
                    ).bePipedThroughFrom(new UnwrapConsumableStream()),
                    close() {
                        socket.end();
                    },
                });
            } catch {
                socket.end();
            }
        });

        if (address) {
            const url = new URL(address);
            if (url.protocol === "tcp:") {
                server.listen(Number.parseInt(url.port, 10), url.hostname);
            } else if (url.protocol === "unix:") {
                server.listen(url.pathname);
            } else {
                throw new Error(`Unsupported protocol ${url.protocol}`);
            }
        } else {
            server.listen();
        }

        await new Promise<void>((resolve, reject) => {
            server.on("listening", () => resolve());
            server.on("error", (e) => reject(e));
        });

        if (!address) {
            const info = server.address() as AddressInfo;
            address = `tcp:${info.address}:${info.port}`;
        }

        this._listeners.set(address, server);
        return address;
    }

    removeReverseTunnel(address: string): ValueOrPromise<void> {
        const server = this._listeners.get(address);
        if (!server) {
            return;
        }
        server.close();
        this._listeners.delete(address);
    }

    clearReverseTunnels(): ValueOrPromise<void> {
        for (const server of this._listeners.values()) {
            server.close();
        }
        this._listeners.clear();
    }
}
