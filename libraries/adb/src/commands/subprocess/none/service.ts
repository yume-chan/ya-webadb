import type { Adb } from "../../../adb.js";
import { splitCommand } from "../utils.js";

import { AdbNoneProtocolTerminal } from "./pty.js";
import { AdbNoneProtocolProcessImpl } from "./spawn.js";
import { AdbNoneProtocolSpawner } from "./spawner.js";

export class AdbNoneProtocolShellService extends AdbNoneProtocolSpawner {
    #adb: Adb;
    get adb(): Adb {
        return this.#adb;
    }

    constructor(adb: Adb) {
        super(
            async (command) =>
                // `shell,raw:${command}` also triggers raw mode,
                // But is not supported on Android version <7.
                new AdbNoneProtocolProcessImpl(
                    await this.#adb.createSocket(`exec:${command.join(" ")}`),
                ),
        );
        this.#adb = adb;
    }

    async pty(command?: string | string[]): Promise<AdbNoneProtocolTerminal> {
        if (typeof command === "string") {
            command = splitCommand(command);
        }

        return new AdbNoneProtocolTerminal(
            await this.#adb.createSocket(`shell:${command?.join(" ")}`),
        );
    }
}
