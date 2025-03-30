import type { Adb } from "../../adb.js";
import { AdbFeature } from "../../features.js";

import { AdbNoneProtocolShellService } from "./none/index.js";
import { AdbShellProtocolShellService } from "./shell/index.js";

export class AdbSubprocessService {
    #adb: Adb;
    get adb() {
        return this.#adb;
    }

    #noneProtocol: AdbNoneProtocolShellService;
    get noneProtocol(): AdbNoneProtocolShellService {
        return this.#noneProtocol;
    }

    #shellProtocol?: AdbShellProtocolShellService;
    get shellProtocol(): AdbShellProtocolShellService | undefined {
        return this.#shellProtocol;
    }

    constructor(adb: Adb) {
        this.#adb = adb;

        this.#noneProtocol = new AdbNoneProtocolShellService(adb);

        if (adb.canUseFeature(AdbFeature.ShellV2)) {
            this.#shellProtocol = new AdbShellProtocolShellService(adb);
        }
    }
}
