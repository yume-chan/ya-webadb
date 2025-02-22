import type { MaybeConsumable, WritableStream } from "@yume-chan/stream-extra";
import { ReadableStream } from "@yume-chan/stream-extra";

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
    static isSupported() {
        return true;
    }

    static async pty(adb: Adb, command: string, signal?: AbortSignal) {
        return new AdbSubprocessNoneProtocol(
            await adb.createSocket(`shell:${command}`),
            signal,
        );
    }

    static async raw(adb: Adb, command: string, signal?: AbortSignal) {
        // `shell,raw:${command}` also triggers raw mode,
        // But is not supported on Android version <7.
        return new AdbSubprocessNoneProtocol(
            await adb.createSocket(`exec:${command}`),
            signal,
        );
    }

    readonly #socket: AdbSocket;

    // Legacy shell forwards all data to stdin.
    get stdin(): WritableStream<MaybeConsumable<Uint8Array>> {
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

    constructor(socket: AdbSocket, signal?: AbortSignal) {
        signal?.throwIfAborted();

        this.#socket = socket;
        signal?.addEventListener("abort", () => void this.kill());

        this.#stderr = new ReadableStream({
            start: async (controller) => {
                await this.#socket.closed;
                controller.close();
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
