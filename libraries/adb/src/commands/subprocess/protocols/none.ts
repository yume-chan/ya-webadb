import type { Consumable, WritableStream } from "@yume-chan/stream-extra";
import { ReadableStream } from "@yume-chan/stream-extra";

import type { Adb, AdbSocket } from "../../../adb.js";
import { unreachable } from "../../../utils/index.js";

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
    static isSupported() {
        return true;
    }

    static async pty(adb: Adb, command: string) {
        return new AdbSubprocessNoneProtocol(
            await adb.createSocket(`shell:${command}`),
        );
    }

    static async raw(adb: Adb, command: string) {
        // `shell,raw:${command}` also triggers raw mode,
        // But is not supported on Android version <7.
        return new AdbSubprocessNoneProtocol(
            await adb.createSocket(`exec:${command}`),
        );
    }

    readonly #socket: AdbSocket;

    // Legacy shell forwards all data to stdin.
    get stdin(): WritableStream<Consumable<Uint8Array>> {
        return this.#socket.writable;
    }

    /**
     * Legacy shell mixes stdout and stderr.
     */
    get stdout(): ReadableStream<Uint8Array> {
        return this.#socket.readable;
    }

    #stderr: ReadableStream<Uint8Array>;
    /**
     * `stderr` will always be empty.
     */
    get stderr(): ReadableStream<Uint8Array> {
        return this.#stderr;
    }

    #exit: Promise<number>;
    get exit() {
        return this.#exit;
    }

    constructor(socket: AdbSocket) {
        this.#socket = socket;

        this.#stderr = new ReadableStream({
            start: (controller) => {
                this.#socket.closed
                    .then(() => controller.close())
                    .catch(unreachable);
            },
        });
        this.#exit = socket.closed.then(() => 0);
    }

    resize() {
        // Not supported, but don't throw.
    }

    async kill() {
        await this.#socket.close();
    }
}
