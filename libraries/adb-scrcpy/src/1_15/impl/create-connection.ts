import type { Adb } from "@yume-chan/adb";
import type { ScrcpyOptions1_15 } from "@yume-chan/scrcpy";

import type {
    AdbScrcpyConnection,
    AdbScrcpyConnectionOptions,
} from "../../connection.js";
import {
    AdbScrcpyForwardConnection,
    AdbScrcpyReverseConnection,
} from "../../connection.js";

export function createConnection(
    adb: Adb,
    options: Pick<ScrcpyOptions1_15.Init, "tunnelForward">,
): AdbScrcpyConnection {
    const connectionOptions: AdbScrcpyConnectionOptions = {
        scid: undefined, // Not Supported
        video: true, // Always enabled
        audio: false, // Not Supported
        control: true, // Always enabled even when `--no-control` is specified
        sendDummyByte: true, // Always enabled
    };
    if (options.tunnelForward) {
        return new AdbScrcpyForwardConnection(adb, connectionOptions);
    } else {
        return new AdbScrcpyReverseConnection(adb, connectionOptions);
    }
}
