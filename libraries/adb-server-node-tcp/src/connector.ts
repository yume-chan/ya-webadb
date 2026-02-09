// cspell: ignore vsock
// cspell: ignore localfilesystem

import type {
    AddressInfo,
    IpcSocketConnectOpts,
    SocketConnectOpts,
    TcpSocketConnectOpts,
} from "node:net";
import { Server, Socket } from "node:net";
import { platform } from "node:os";

import type { AdbIncomingSocketHandler, AdbServerClient } from "@yume-chan/adb";
import {
    MaybeConsumable,
    PushReadableStream,
    tryClose,
} from "@yume-chan/stream-extra";

import { decimalToNumber, parseTcpSocketSpec } from "./socket-spec.js";

function nodeSocketToConnection(
    socket: Socket,
): AdbServerClient.ServerConnection {
    socket.setNoDelay(true);

    const closed = new Promise<undefined>((resolve) => {
        socket.once("close", resolve);
    });

    return {
        readable: new PushReadableStream<Uint8Array>((controller) => {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            socket.on("data", async (data) => {
                if (controller.abortSignal.aborted) {
                    return;
                }

                socket.pause();
                // `socket.encoding` is not set,
                // so `data` is `Buffer<ArrayBuffer>`
                await controller.enqueue(data as Buffer<ArrayBuffer>);
                socket.resume();
            });
            socket.on("error", (e) => {
                controller.error(e);
            });
            socket.on("end", () => {
                tryClose(controller);
            });
        }),
        writable: new MaybeConsumable.WritableStream<Uint8Array>({
            start(controller) {
                socket.on("error", (e) => {
                    controller.error(e);
                });
            },
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

const DefaultServerPort = 5037;

const SocketTypes: Record<string, (spec: string) => SocketConnectOpts> = {
    tcp: (spec) => {
        const parsed = parseTcpSocketSpec(spec);
        return {
            host: parsed.host ?? "localhost",
            port: parsed.port ?? DefaultServerPort,
        };
    },
    vsock: () => {
        throw new Error("vsock is not supported in Node.js");
    },
    local: (spec) => {
        if (platform() === "win32") {
            throw new Error(
                "socket type local is unavailable on this platform",
            );
        }
        return { path: spec };
    },
    localabstract: () => {
        throw new Error("localabstract is not supported in Node.js");
    },
    localfilesystem: (spec) => {
        if (platform() === "win32") {
            throw new Error(
                "socket type localfilesystem is unavailable on this platform",
            );
        }
        return { path: spec };
    },
};

function parseSocketSpec(spec: string): SocketConnectOpts {
    for (const [type, parser] of Object.entries(SocketTypes)) {
        if (spec.startsWith(type + ":")) {
            return parser(spec.substring(type.length + 1));
        }
    }
    throw new Error(`unknown socket specification: ${spec}`);
}

function getServerSocketSpec() {
    const value = process.env["ADB_SERVER_SOCKET"];
    if (value) {
        return parseSocketSpec(value);
    }
    return undefined;
}

function getServerAddress() {
    return process.env["ANDROID_ADB_SERVER_ADDRESS"] ?? "localhost";
}

function getServerPort() {
    const value = process.env["ANDROID_ADB_SERVER_PORT"];
    if (!value) {
        return DefaultServerPort;
    }

    const port = decimalToNumber(value);
    if (port === undefined || port <= 0 || port > 65535) {
        throw new Error(
            `$ANDROID_ADB_SERVER_PORT must be a positive number less than 65535: got "${value}"`,
        );
    }
    return port;
}

/**
 * An `AdbServerClient.ServerConnector` implementation for Node.js.
 */
export class AdbServerNodeTcpConnector
    implements AdbServerClient.ServerConnector
{
    readonly spec: SocketConnectOpts;

    readonly #listeners = new Map<string, Server>();

    /**
     * Creates an new instance of {@link AdbServerNodeTcpConnector}
     * by connecting to the default socket spec.
     *
     * If environment variable `ADB_SERVER_SOCKET` is set,
     * it will be parsed as an ADB socket spec and used.
     *
     * Otherwise, a TCP socket spec is used,
     * where the host is `localhost` or the value of the environment variable `ADB_SERVER_ADDRESS`,
     * and the port is `5037` or the value of the environment variable `ADB_SERVER_PORT`.
     */
    constructor();

    /**
     *
     * Creates an new instance of {@link AdbServerNodeTcpConnector}
     * by connecting to the specified socket spec.
     *
     * @param spec An ADB socket spec.
     *
     * TCP sockets:
     *
     * - `"tcp:<host>"`: connects to the default TCP port on the specified host
     * - `"tcp:<port>"`: connects to the specified TCP port on default host
     * - `"tcp:<host>:<port>"`: connects to the specified port on the specified host
     *
     * The default host is `localhost`, or the value of the environment variable `ADB_SERVER_ADDRESS`.
     *
     * The default port is `5037`, or the value of the environment variable `ADB_SERVER_PORT`.
     *
     * Unix domain sockets:
     *
     * - `"local:<path>"` or `"localfilesystem:<path>"`:
     * connects to the specified Unix domain socket on a file path.
     * Not supported on Windows.
     *
     * `vsock:` and `localabstract:` socket specs are not supported.
     */
    constructor(spec: string);

    /**
     * Creates an new instance of {@link AdbServerNodeTcpConnector}
     * using the specified TCP connect options.
     *
     * Unlike the original Node.js TCP connect options, the `port` field is also optional.
     *
     * @param spec A TCP connect options
     *
     * If both `port` and `host` fields are `undefined`, and
     * environment variable `ADB_SERVER_SOCKET` is set,
     * it will be parsed as an ADB socket spec and used.
     * (If `ADB_SERVER_SOCKET` is not a TCP socket spec, the specified options will be ignored.)
     *
     * Otherwise,
     * if the `host` field is `undefined`, the default value is `localhost`,
     * or the value of the environment variable `ADB_SERVER_ADDRESS`.
     * If the `port` field is `undefined`, the default value is `5037`,
     * or the value of the environment variable `ADB_SERVER_PORT`.
     */
    constructor(
        spec: Omit<TcpSocketConnectOpts, "port"> & {
            port?: number | undefined;
        },
    );

    /**
     * Creates an new instance of {@link AdbServerNodeTcpConnector}
     * using the specified Node.js Unix domain socket connect options.
     *
     * Not supported on Windows, because ADB server can't listen on Named Pipes on Windows.
     *
     * @param spec A Node.js domain socket connect options
     */
    constructor(spec: IpcSocketConnectOpts);

    constructor(
        spec?:
            | string
            | (Omit<TcpSocketConnectOpts, "port"> & {
                  port?: number | undefined;
              })
            | IpcSocketConnectOpts,
    ) {
        if (!spec) {
            // none of -L -H and -P was specified
            const value = getServerSocketSpec();
            if (value) {
                this.spec = value;
                return;
            }

            this.spec = {
                host: getServerAddress(),
                port: getServerPort(),
            };
            return;
        }

        if (typeof spec === "string") {
            // adb -L <spec>
            this.spec = parseSocketSpec(spec);
            return;
        }

        if ("path" in spec) {
            if (platform() === "win32") {
                throw new Error(
                    "socket type local is unavailable on this platform",
                );
            }
            // adb -L local:<spec>
            this.spec = spec;
            return;
        }

        if (!spec.host && !spec.port) {
            // none of -L -H and -P was specified
            // (but some Node.js options are specified)
            const value = getServerSocketSpec();
            if (value) {
                if ("path" in value) {
                    this.spec = value;
                } else {
                    this.spec = { ...spec, ...value };
                }
                return;
            }
        }

        this.spec = {
            ...spec,
            // -H
            host: spec.host ?? getServerAddress(),
            // -P
            port: spec.port ?? getServerPort(),
        };
    }

    async connect(
        { unref, signal }: AdbServerClient.ServerConnectionOptions = {
            unref: false,
        },
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
            if (address.startsWith("tcp:")) {
                const spec = parseTcpSocketSpec(address.substring(4));
                if (!spec.port) {
                    throw new Error(
                        `Invalid destination port: '${address.substring(4)}'`,
                    );
                }
                server.listen(spec.port, spec.host);
            } else if (address.startsWith("unix:")) {
                server.listen(address.substring(5));
            } else {
                throw new TypeError(`Unsupported protocol ${address}`);
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

    removeReverseTunnel(address: string): void {
        const server = this.#listeners.get(address);
        if (!server) {
            return;
        }
        server.close();
        this.#listeners.delete(address);
    }

    clearReverseTunnels(): void {
        for (const server of this.#listeners.values()) {
            server.close();
        }
        this.#listeners.clear();
    }
}
