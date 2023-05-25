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

    readonly #socket: AdbSocket;

    readonly #duplex: DuplexStreamFactory<Uint8Array, Uint8Array>;

    // Legacy shell forwards all data to stdin.
    public get stdin() {
        return this.#socket.writable;
    }

    #stdout: ReadableStream<Uint8Array>;
    /**
     * Legacy shell mixes stdout and stderr.
     */
    public get stdout() {
        return this.#stdout;
    }

    #stderr: ReadableStream<Uint8Array>;
    /**
     * `stderr` will always be empty.
     */
    public get stderr() {
        return this.#stderr;
    }

    #exit: Promise<number>;
    public get exit() {
        return this.#exit;
    }

    public constructor(socket: AdbSocket) {
        this.#socket = socket;

        // Link `stdout`, `stderr` and `stdin` together,
        // so closing any of them will close the others.
        this.#duplex = new DuplexStreamFactory<Uint8Array, Uint8Array>({
            close: async () => {
                await this.#socket.close();
            },
        });

        this.#stdout = this.#duplex.wrapReadable(this.#socket.readable);
        this.#stderr = this.#duplex.wrapReadable(new ReadableStream());
        this.#exit = this.#duplex.closed.then(() => 0);
    }

    public resize() {
        // Not supported, but don't throw.
    }

    public kill() {
        return this.#duplex.close();
    }
}
