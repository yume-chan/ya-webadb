import type { Adb } from "../../../adb.js";
import { AdbFeature } from "../../../features.js";
import { splitCommand } from "../utils.js";

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

    async pty(
        command?: string | string[],
    ): Promise<AdbShellProtocolPtyProcess> {
        if (typeof command === "string") {
            command = splitCommand(command);
        }

        // TODO: Support setting `XTERM` environment variable
        return new AdbShellProtocolPtyProcess(
            await this.#adb.createSocket(`shell,v2,pty:${command?.join(" ")}`),
        );
    }
}
