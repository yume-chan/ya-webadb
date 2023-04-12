import type { Adb } from "@yume-chan/adb";
import type { ScrcpyOptionsInit1_22 } from "@yume-chan/scrcpy";

import type { AdbScrcpyConnection } from "../connection.js";

import { AdbScrcpyOptions1_16 } from "./1_16.js";
import { AdbScrcpyOptionsBase } from "./types.js";

export class AdbScrcpyOptions1_22 extends AdbScrcpyOptionsBase<ScrcpyOptionsInit1_22> {
    public override createConnection(adb: Adb): AdbScrcpyConnection {
        return AdbScrcpyOptions1_16.createConnection(
            adb,
            {
                scid: -1,
                control: this.value.control,
                sendDummyByte: this.value.sendDummyByte,
                audio: false,
            },
            this.tunnelForwardOverride || this.value.tunnelForward
        );
    }
}
