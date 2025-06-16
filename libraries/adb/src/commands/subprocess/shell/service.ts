import type { Adb } from "../../../adb.js";
import { AdbFeature } from "../../../features.js";

import { AdbShellProtocolProcessImpl } from "./process.js";
import { AdbShellProtocolPtyProcess } from "./pty.js";
import { AdbShellProtocolSpawner } from "./spawner.js";

export class AdbShellProtocolSubprocessService extends AdbShellProtocolSpawner {
    readonly #adb: Adb;
    get adb() {
        return this.#adb;
    }

    get isSupported() {
        return this.#adb.canUseFeature(AdbFeature.ShellV2);
    }

    constructor(adb: Adb) {
        super(async (command, signal) => {
            const socket = await this.#adb.createSocket(
                `shell,v2,raw:${command.join(" ")}`,
            );

            if (signal?.aborted) {
                await socket.close();
                throw signal.reason;
            }

            return new AdbShellProtocolProcessImpl(socket, signal);
        });
        this.#adb = adb;
    }

    async pty(options?: {
        command?: string | readonly string[] | undefined;
        terminalType?: string;
    }): Promise<AdbShellProtocolPtyProcess> {
        let service = "shell,v2,pty";

        if (options?.terminalType) {
            service += `,TERM=` + options.terminalType;
        }

        service += ":";

        if (options) {
            if (typeof options.command === "string") {
                service += options.command;
            } else if (Array.isArray(options.command)) {
                service += options.command.join(" ");
            }
        }

        return new AdbShellProtocolPtyProcess(
            await this.#adb.createSocket(service),
        );
    }
}
