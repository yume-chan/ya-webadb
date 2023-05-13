import { DuplexStreamFactory, ReadableStream } from "@yume-chan/stream-extra";

import type { Adb, AdbSocket } from "../../../adb.js";

import type { AdbSubprocessProtocol } from "./types.js";

/**
 * The legacy shell
 *
 * Features:
 * * `stderr`: No
 * * `exit` exit code: No
 * * `resize`: No
 */
export class AdbSubprocessNoneProtocol implements AdbSubprocessProtocol {
    public static isSupported() {
        return true;
    }

    public static async pty(adb: Adb, command: string) {
        return new AdbSubprocessNoneProtocol(
            await adb.createSocket(`shell:${command}`)
        );
    }

    public static async raw(adb: Adb, command: string) {
        // `shell,raw:${command}` also triggers raw mode,
        // But is not supported on Android version <7.
        return new AdbSubprocessNoneProtocol(
            await adb.createSocket(`exec:${command}`)
        );
    }

    private readonly _socket: AdbSocket;

    private readonly _duplex: DuplexStreamFactory<Uint8Array, Uint8Array>;

    // Legacy shell forwards all data to stdin.
    public get stdin() {
        return this._socket.writable;
    }

    private _stdout: ReadableStream<Uint8Array>;
    /**
     * Legacy shell mixes stdout and stderr.
     */
    public get stdout() {
        return this._stdout;
    }

    private _stderr: ReadableStream<Uint8Array>;
    /**
     * `stderr` will always be empty.
     */
    public get stderr() {
        return this._stderr;
    }

    private _exit: Promise<number>;
    public get exit() {
        return this._exit;
    }

    public constructor(socket: AdbSocket) {
        this._socket = socket;

        // Link `stdout`, `stderr` and `stdin` together,
        // so closing any of them will close the others.
        this._duplex = new DuplexStreamFactory<Uint8Array, Uint8Array>({
            close: async () => {
                await this._socket.close();
            },
        });

        this._stdout = this._duplex.wrapReadable(this._socket.readable);
        this._stderr = this._duplex.wrapReadable(new ReadableStream());
        this._exit = this._duplex.closed.then(() => 0);
    }

    public resize() {
        // Not supported, but don't throw.
    }

    public kill() {
        return this._duplex.close();
    }
}
