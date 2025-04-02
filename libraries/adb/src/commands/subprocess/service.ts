import type { Adb } from "../../adb.js";
import { AdbFeature } from "../../features.js";

import { AdbNoneProtocolSubprocessService } from "./none/index.js";
import { AdbShellProtocolSubprocessService } from "./shell/index.js";

export class AdbSubprocessService {
    #adb: Adb;
    get adb() {
        return this.#adb;
    }

    #noneProtocol: AdbNoneProtocolSubprocessService;
    get noneProtocol(): AdbNoneProtocolSubprocessService {
        return this.#noneProtocol;
    }

    #shellProtocol?: AdbShellProtocolSubprocessService;
    get shellProtocol(): AdbShellProtocolSubprocessService | undefined {
        return this.#shellProtocol;
    }

    constructor(adb: Adb) {
        this.#adb = adb;

        this.#noneProtocol = new AdbNoneProtocolSubprocessService(adb);

        if (adb.canUseFeature(AdbFeature.ShellV2)) {
            this.#shellProtocol = new AdbShellProtocolSubprocessService(adb);
        }
    }
}
