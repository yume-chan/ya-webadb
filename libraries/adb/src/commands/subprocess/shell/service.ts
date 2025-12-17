import type { Adb } from "../../../adb.js";
import { AdbFeature } from "../../../features.js";

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
        if (!command.length) {
            throw new Error("Command cannot be empty");
        }

        // Don't escape `command`. See `AdbNoneProtocolSubprocessService.prototype.spawn` for details.
        const service = "shell,v2,raw:" + command.join(" ");
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
            if (terminalType.includes(",") || terminalType.includes(":")) {
                throw new Error("terminalType must not contain ',' or ':'");
            }
            service += `,TERM=` + terminalType;
        }
        service += ":";

        if (typeof command === "string") {
            service += command;
        } else if (Array.isArray(command)) {
            // Don't escape `command`. See `AdbNoneProtocolSubprocessService.prototype.spawn` for details.
            service += command.join(" ");
        }

        return new AdbShellProtocolPtyProcess(
            await this.#adb.createSocket(service),
        );
    }
}
