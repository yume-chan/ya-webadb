import type { Adb } from "../../../adb.js";

import { AdbNoneProtocolPtyProcess } from "./pty.js";
import { AdbNoneProtocolProcessImpl } from "./spawn.js";
import { AdbNoneProtocolSpawner } from "./spawner.js";

export class AdbNoneProtocolSubprocessService extends AdbNoneProtocolSpawner {
    readonly #adb: Adb;
    get adb(): Adb {
        return this.#adb;
    }

    constructor(adb: Adb) {
        super(
            async (command, signal) =>
                // `shell,raw:${command}` also triggers raw mode,
                // But is not supported on Android version <7.
                new AdbNoneProtocolProcessImpl(
                    await this.#adb.createSocket(`exec:${command.join(" ")}`),
                    signal,
                ),
        );
        this.#adb = adb;
    }

    async pty(command?: string | string[]): Promise<AdbNoneProtocolPtyProcess> {
        if (command === undefined) {
            command = "";
        } else if (Array.isArray(command)) {
            command = command.join(" ");
        }

        return new AdbNoneProtocolPtyProcess(
            await this.#adb.createSocket(`shell:${command}`),
        );
    }
}
