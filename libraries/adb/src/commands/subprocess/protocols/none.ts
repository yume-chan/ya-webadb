import type { MaybeConsumable, WritableStream } from "@yume-chan/stream-extra";
import { ReadableStream } from "@yume-chan/stream-extra";

import type { Adb, AdbSocket } from "../../../adb.js";
import type { Process } from "../process.js";
import type { AdbProcessSpawner } from "../spawner.js";

/**
 * The legacy shell
 *
 * Features:
 * * `stderr`: No
 * * `exit` exit code: No
 * * `resize`: No
 */
export class AdbNoneProtocolProcess implements Process {
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

    #exited: Promise<number>;
    get exited() {
        return this.#exited;
    }

    constructor(socket: AdbSocket) {
        this.#socket = socket;

        this.#stderr = new ReadableStream({
            start: async (controller) => {
                await this.#socket.closed;
                controller.close();
            },
        });
        this.#exited = socket.closed.then(() => 0);
    }

    resize() {
        throw new Error("Resizing is not supported by none protocol");
    }

    async kill() {
        await this.#socket.close();
    }
}

export class AdbNoneProtocolSpawner implements AdbProcessSpawner {
    #adb: Adb;
    get adb() {
        return this.#adb;
    }

    get isSupported() {
        return true;
    }

    constructor(adb: Adb) {
        this.#adb = adb;
    }

    async raw(command: string[]): Promise<Process> {
        // `shell,raw:${command}` also triggers raw mode,
        // But is not supported on Android version <7.
        return new AdbNoneProtocolProcess(
            await this.#adb.createSocket(`exec:${command.join(" ")}`),
        );
    }

    async pty(command: string[]): Promise<Process> {
        return new AdbNoneProtocolProcess(
            await this.#adb.createSocket(`shell:${command.join(" ")}`),
        );
    }
}
