import type { AddressInfo, SocketConnectOpts } from "net";
import { Server, Socket } from "net";

import type {
    AdbIncomingSocketHandler,
    AdbServerConnection,
    AdbServerConnectionOptions,
    AdbServerConnector,
} from "@yume-chan/adb";
import {
    PushReadableStream,
    UnwrapConsumableStream,
    WrapWritableStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import type { ValueOrPromise } from "@yume-chan/struct";

function nodeSocketToConnection(socket: Socket): AdbServerConnection {
    socket.setNoDelay(true);

    const closed = new Promise<void>((resolve) => {
        socket.on("close", resolve);
    });

    return {
        readable: new PushReadableStream<Uint8Array>((controller) => {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            socket.on("data", async (data) => {
                if (controller.abortSignal.aborted) {
                    return;
                }

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
        }),
        get closed() {
            return closed;
        },
        close() {
            socket.end();
        },
    };
}

export class AdbServerNodeTcpConnector implements AdbServerConnector {
    readonly spec: SocketConnectOpts;

    readonly #listeners = new Map<string, Server>();

    constructor(spec: SocketConnectOpts) {
        this.spec = spec;
    }

    async connect(
        { unref }: AdbServerConnectionOptions = { unref: false },
    ): Promise<AdbServerConnection> {
        const socket = new Socket();
        if (unref) {
            socket.unref();
        }
        socket.connect(this.spec);
        await new Promise<void>((resolve, reject) => {
            socket.once("connect", resolve);
            socket.once("error", reject);
        });
        return nodeSocketToConnection(socket);
    }

    async addReverseTunnel(
        handler: AdbIncomingSocketHandler,
        address?: string,
    ): Promise<string> {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        const server = new Server(async (socket) => {
            const connection = nodeSocketToConnection(socket);
            try {
                await handler({
                    service: address!,
                    readable: connection.readable,
                    writable: new WrapWritableStream(
                        connection.writable,
                    ).bePipedThroughFrom(new UnwrapConsumableStream()),
                    get closed() {
                        return connection.closed;
                    },
                    async close() {
                        await connection.close();
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

        this.#listeners.set(address, server);
        return address;
    }

    removeReverseTunnel(address: string): ValueOrPromise<void> {
        const server = this.#listeners.get(address);
        if (!server) {
            return;
        }
        server.close();
        this.#listeners.delete(address);
    }

    clearReverseTunnels(): ValueOrPromise<void> {
        for (const server of this.#listeners.values()) {
            server.close();
        }
        this.#listeners.clear();
    }
}
