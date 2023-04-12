import type { Adb } from "@yume-chan/adb";
import type { ScrcpyOptionsInit2_0 } from "@yume-chan/scrcpy";

import type { AdbScrcpyConnection } from "../connection.js";

import { AdbScrcpyOptions1_16 } from "./1_16.js";
import { AdbScrcpyOptionsBase } from "./types.js";

export class AdbScrcpyOptions2_0 extends AdbScrcpyOptionsBase<ScrcpyOptionsInit2_0> {
    public override createConnection(adb: Adb): AdbScrcpyConnection {
        return AdbScrcpyOptions1_16.createConnection(
            adb,
            {
                scid: this.value.scid.value,
                control: this.value.control,
                sendDummyByte: this.value.sendDummyByte,
                audio: this.value.audio,
            },
            this.tunnelForwardOverride || this.value.tunnelForward
        );
    }
}
