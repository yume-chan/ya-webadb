import type { Adb } from "../../adb.js";
import { AdbFeature } from "../../features.js";

import { ProcessHelper } from "./helper.js";
import { AdbNoneProtocolSpawner } from "./protocols/none.js";
import { AdbShellProtocolSpawner } from "./protocols/shell.js";

export class AdbSubprocessService {
    #adb: Adb;
    get adb() {
        return this.#adb;
    }

    #noneProtocol: ProcessHelper;
    get noneProtocol() {
        return this.#noneProtocol;
    }

    #shellProtocol?: ProcessHelper;
    get shellProtocol() {
        return this.#shellProtocol;
    }

    constructor(adb: Adb) {
        this.#adb = adb;

        this.#noneProtocol = new ProcessHelper(new AdbNoneProtocolSpawner(adb));

        if (adb.canUseFeature(AdbFeature.ShellV2)) {
            this.#shellProtocol = new ProcessHelper(
                new AdbShellProtocolSpawner(adb),
            );
        }
    }
}
