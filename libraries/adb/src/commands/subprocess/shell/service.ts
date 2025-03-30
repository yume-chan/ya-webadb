import type { Adb } from "../../../adb.js";
import { AdbFeature } from "../../../features.js";

import { AdbShellProtocolPtyProcess } from "./pty.js";
import { AdbShellProtocolProcessImpl } from "./spawn.js";
import { AdbShellProtocolSpawner } from "./spawner.js";

export class AdbShellProtocolSubprocessService extends AdbShellProtocolSpawner {
    #adb: Adb;
    get adb() {
        return this.#adb;
    }

    get isSupported() {
        return this.#adb.canUseFeature(AdbFeature.ShellV2);
    }

    constructor(adb: Adb) {
        super(
            async (command) =>
                new AdbShellProtocolProcessImpl(
                    await this.#adb.createSocket(
                        `shell,v2,raw:${command.join(" ")}`,
                    ),
                ),
        );
        this.#adb = adb;
    }

    async pty({
        command,
        terminalType,
    }: {
        command?: string | string[] | undefined;
        terminalType?: string;
    }): Promise<AdbShellProtocolPtyProcess> {
        let service = "shell,v2,pty";

        if (terminalType) {
            service += `,TERM=` + terminalType;
        }

        service += ":";

        if (typeof command === "string") {
            service += command;
        } else if (Array.isArray(command)) {
            service += command.join(" ");
        }

        return new AdbShellProtocolPtyProcess(
            await this.#adb.createSocket(service),
        );
    }
}
