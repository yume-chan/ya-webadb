import type { AddressInfo, SocketConnectOpts } from "net";
import { Server, Socket } from "net";

import type { AdbIncomingSocketHandler, AdbServerClient } from "@yume-chan/adb";
import type { MaybePromiseLike } from "@yume-chan/async";
import {
    MaybeConsumable,
    PushReadableStream,
    tryClose,
} from "@yume-chan/stream-extra";

function nodeSocketToConnection(
    socket: Socket,
): AdbServerClient.ServerConnection {
    socket.setNoDelay(true);

    const closed = new Promise<undefined>((resolve) => {
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
                tryClose(controller);
            });
        }),
        writable: new MaybeConsumable.WritableStream<Uint8Array>({
            write: (chunk) => {
                return new Promise<void>((resolve, reject) => {
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

/**
 * An `AdbServerClient.ServerConnector` implementation for Node.js.
 */
export class AdbServerNodeTcpConnector
    implements AdbServerClient.ServerConnector
{
    readonly spec: SocketConnectOpts;

    readonly #listeners = new Map<string, Server>();

    constructor(spec: SocketConnectOpts) {
        this.spec = spec;
    }

    async connect(
        { unref, signal }: AdbServerClient.ServerConnectionOptions = { unref: false },
    ): Promise<AdbServerClient.ServerConnection> {
        const socket = new Socket({ signal: signal as globalThis.AbortSignal });
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
                    writable: connection.writable,
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
                throw new TypeError(`Unsupported protocol ${url.protocol}`);
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
            address = `tcp:${info.port}`;
        }

        this.#listeners.set(address, server);
        return address;
    }

    removeReverseTunnel(address: string): MaybePromiseLike<void> {
        const server = this.#listeners.get(address);
        if (!server) {
            return;
        }
        server.close();
        this.#listeners.delete(address);
    }

    clearReverseTunnels(): MaybePromiseLike<void> {
        for (const server of this.#listeners.values()) {
            server.close();
        }
        this.#listeners.clear();
    }
}
