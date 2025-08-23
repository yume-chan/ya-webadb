import type { Adb } from "../../../adb.js";

import { AdbNoneProtocolProcessImpl } from "./process.js";
import { AdbNoneProtocolPtyProcess } from "./pty.js";
import { adbNoneProtocolSpawner } from "./spawner.js";

export class AdbNoneProtocolSubprocessService {
    readonly #adb: Adb;
    get adb(): Adb {
        return this.#adb;
    }

    constructor(adb: Adb) {
        this.#adb = adb;
    }

    spawn = adbNoneProtocolSpawner(async (command, signal) => {
        // `shell,raw:${command}` also triggers raw mode,
        // But is not supported on Android version <7.
        const socket = await this.#adb.createSocket(
            `exec:${command.join(" ")}`,
        );

        if (signal?.aborted) {
            await socket.close();
            throw signal.reason;
        }

        return new AdbNoneProtocolProcessImpl(socket, signal);
    });

    async pty(
        command?: string | readonly string[],
    ): Promise<AdbNoneProtocolPtyProcess> {
        if (command === undefined) {
            command = "";
        } else if (Array.isArray(command)) {
            command = command.join(" ");
        }

        return new AdbNoneProtocolPtyProcess(
            // https://github.com/microsoft/typescript/issues/17002
            await this.#adb.createSocket(`shell:${command as string}`),
        );
    }
}
