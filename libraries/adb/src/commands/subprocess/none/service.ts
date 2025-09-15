import type { Adb } from "../../../adb.js";
import { escapeSpaces } from "../utils.js";

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
        // Android 7 added `shell,raw:${command}` service which also triggers raw mode,
        // but we want to use the most compatible one.
        let service = "exec:";

        if (!command.length) {
            throw new Error("Command cannot be empty");
        }

        // Only escape spaces to preseve the command array.
        // Because `command` may include environment variables (`KEY=value`)
        // and shell expansions (`"$KEY"` vs `'$KEY'`),
        // we can't escape them with quotes blindly
        service += command.map(escapeSpaces).join(" ");

        const socket = await this.#adb.createSocket(service);

        if (signal?.aborted) {
            await socket.close();
            throw signal.reason;
        }

        return new AdbNoneProtocolProcessImpl(socket, signal);
    });

    async pty(
        command?: string | readonly string[],
    ): Promise<AdbNoneProtocolPtyProcess> {
        let service = "shell:";

        if (typeof command === "string") {
            service += command;
        } else if (Array.isArray(command)) {
            // Only escape spaces. See `spawn` above for details
            service += command.map(escapeSpaces).join(" ");
        }

        return new AdbNoneProtocolPtyProcess(
            await this.#adb.createSocket(service),
        );
    }
}
