import type { Adb } from "@yume-chan/adb";
import type { ScrcpyOptionsInit1_16 } from "@yume-chan/scrcpy";

import type {
    AdbScrcpyConnection,
    AdbScrcpyConnectionOptions,
} from "../connection.js";
import {
    AdbScrcpyForwardConnection,
    AdbScrcpyReverseConnection,
} from "../connection.js";

import { AdbScrcpyOptionsBase } from "./types.js";

export class AdbScrcpyOptions1_16 extends AdbScrcpyOptionsBase<ScrcpyOptionsInit1_16> {
    public static createConnection(
        adb: Adb,
        connectionOptions: AdbScrcpyConnectionOptions,
        tunnelForward: boolean
    ): AdbScrcpyConnection {
        if (tunnelForward) {
            return new AdbScrcpyForwardConnection(adb, connectionOptions);
        } else {
            return new AdbScrcpyReverseConnection(adb, connectionOptions);
        }
    }

    public override createConnection(adb: Adb): AdbScrcpyConnection {
        return AdbScrcpyOptions1_16.createConnection(
            adb,
            {
                scid: -1,
                // Old versions always have control stream no matter what the option is
                // Pass `control: false` to `Connection` will disable the control stream
                control: true,
                sendDummyByte: true,
                audio: false,
            },
            this.tunnelForwardOverride || this.value.tunnelForward
        );
    }
}
