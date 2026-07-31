import type { IpcSocketConnectOpts, TcpSocketConnectOpts } from "net";

import { AdbServerClient } from "@yume-chan/adb";

import { AdbServerNodeTcpConnector } from "./connector.js";

/**
 * An {@link AdbServerClient} implementation using
 * {@link AdbServerNodeTcpConnector} to connect to ADB server.
 *
 * Constructors must be synced with {@link AdbServerNodeTcpConnector} constructors.
 */
export class AdbServerNodeJsClient extends AdbServerClient {
    /**
     * Creates an new instance of {@link AdbServerNodeJsClient}
     * by connecting to the default socket spec.
     *
     * If environment variable `ADB_SERVER_SOCKET` is set,
     * it will be parsed as an ADB socket spec and used.
     *
     * Otherwise, a TCP socket spec is used,
     * where the host is `localhost` or the value of the environment variable `ANDROID_ADB_SERVER_ADDRESS`,
     * and the port is `5037` or the value of the environment variable `ANDROID_ADB_SERVER_PORT`.
     */
    constructor();

    /**
     *
     * Creates an new instance of {@link AdbServerNodeJsClient}
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
     * The default host is `localhost`, or the value of the environment variable `ANDROID_ADB_SERVER_ADDRESS`.
     *
     * The default port is `5037`, or the value of the environment variable `ANDROID_ADB_SERVER_PORT`.
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
     * Creates an new instance of {@link AdbServerNodeJsClient}
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
     * or the value of the environment variable `ANDROID_ADB_SERVER_ADDRESS`.
     * If the `port` field is `undefined`, the default value is `5037`,
     * or the value of the environment variable `ANDROID_ADB_SERVER_PORT`.
     */
    constructor(
        spec: Omit<TcpSocketConnectOpts, "port"> & {
            port?: number | undefined;
        },
    );

    /**
     * Creates an new instance of {@link AdbServerNodeJsClient}
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
        const connector = new AdbServerNodeTcpConnector(spec as never);
        super(connector);
    }
}
