import type { Adb } from "@yume-chan/adb";

import type { ScrcpyOptionsInit1_16 } from "../../options/index.js";
import type {
    AdbScrcpyConnection,
    AdbScrcpyConnectionOptions,
} from "../connection.js";
import {
    AdbScrcpyForwardConnection,
    AdbScrcpyReverseConnection,
} from "../connection.js";

import { AdbScrcpyOptionsBase } from "./types.js";

export class AdbScrcpyOptions1_16<
    T extends ScrcpyOptionsInit1_16 = ScrcpyOptionsInit1_16
> extends AdbScrcpyOptionsBase<T> {
    public override createConnection(adb: Adb): AdbScrcpyConnection {
        const options: AdbScrcpyConnectionOptions = {
            // Old versions always have control stream no matter what the option is
            // Pass `control: false` to `Connection` will disable the control stream
            control: true,
            sendDummyByte: true,
            sendDeviceMeta: true,
        };
        if (this.value.tunnelForward) {
            return new AdbScrcpyForwardConnection(adb, options);
        } else {
            return new AdbScrcpyReverseConnection(adb, options);
        }
    }
}
