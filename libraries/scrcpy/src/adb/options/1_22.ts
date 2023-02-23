import type { Adb } from "@yume-chan/adb";

import type { ScrcpyOptionsInit1_22 } from "../../options/index.js";
import type { AdbScrcpyConnection } from "../connection.js";
import {
    AdbScrcpyForwardConnection,
    AdbScrcpyReverseConnection,
} from "../connection.js";

import { AdbScrcpyOptions1_16 } from "./1_16.js";

export class AdbScrcpyOptions1_22<
    T extends ScrcpyOptionsInit1_22 = ScrcpyOptionsInit1_22
> extends AdbScrcpyOptions1_16<T> {
    public override createConnection(adb: Adb): AdbScrcpyConnection {
        const options = {
            ...this.getDefaultValue(),
            ...this.value,
        };
        if (this.value.tunnelForward) {
            return new AdbScrcpyForwardConnection(adb, options);
        } else {
            return new AdbScrcpyReverseConnection(adb, options);
        }
    }
}
