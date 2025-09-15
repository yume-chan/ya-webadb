import type { Adb } from "../../../adb.js";
import { AdbFeature } from "../../../features.js";
import { escapeSpaces } from "../utils.js";

import { AdbShellProtocolProcessImpl } from "./process.js";
import { AdbShellProtocolPtyProcess } from "./pty.js";
import { adbShellProtocolSpawner } from "./spawner.js";

export class AdbShellProtocolSubprocessService {
    readonly #adb: Adb;
    get adb() {
        return this.#adb;
    }

    get isSupported() {
        return this.#adb.canUseFeature(AdbFeature.Shell2);
    }

    constructor(adb: Adb) {
        this.#adb = adb;
    }

    spawn = adbShellProtocolSpawner(async (command, signal) => {
        let service = "shell,v2,raw:";

        if (!command.length) {
            throw new Error("Command cannot be empty");
        }

        // Only escape spaces. See `AdbNoneProtocolSubprocessService.prototype.spawn` for details.
        service += command.map(escapeSpaces).join(" ");

        const socket = await this.#adb.createSocket(service);

        if (signal?.aborted) {
            await socket.close();
            throw signal.reason;
        }

        return new AdbShellProtocolProcessImpl(socket, signal);
    });

    async pty(options?: {
        command?: string | readonly string[] | undefined;
        terminalType?: string;
    }): Promise<AdbShellProtocolPtyProcess> {
        const { command, terminalType } = options ?? {};

        let service = "shell,v2,pty";

        if (terminalType) {
            service += `,TERM=` + terminalType;
        }

        service += ":";

        if (typeof command === "string") {
            service += command;
        } else if (Array.isArray(command)) {
            // Only escape spaces. See `AdbNoneProtocolSubprocessService.prototype.spawn` for details.
            service += command.map(escapeSpaces).join(" ");
        }

        return new AdbShellProtocolPtyProcess(
            await this.#adb.createSocket(service),
        );
    }
}
