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
        // Android 7 added `shell,raw:${command}` service which also triggers raw mode,
        // but we want to use the most compatible one.
        let service = "exec:";

        if (!command.length) {
            throw new Error("Command cannot be empty");
        }

        // Similar to SSH, we don't escape the `command`,
        // because the command will be invoked by `sh -c`,
        // it can contain environment variables (`KEY=value command`),
        // and shell expansions (`echo "$KEY"` vs `echo '$KEY'`),
        // which we can't know how to properly escape.
        service += command.join(" ");

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
            // Don't escape `command`. See `spawn` above for details
            service += command.join(" ");
        }

        return new AdbNoneProtocolPtyProcess(
            await this.#adb.createSocket(service),
        );
    }
}
