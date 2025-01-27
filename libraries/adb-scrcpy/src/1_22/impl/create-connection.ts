import type { Adb } from "@yume-chan/adb";
import type { ScrcpyOptions1_22 } from "@yume-chan/scrcpy";

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
    options: Required<
        Pick<
            ScrcpyOptions1_22.Init,
            "tunnelForward" | "control" | "sendDummyByte"
        >
    >,
): AdbScrcpyConnection {
    const connectionOptions: AdbScrcpyConnectionOptions = {
        scid: undefined, // Not Supported
        video: true, // Always enabled
        audio: false, // Not Supported
        control: options.control,
        sendDummyByte: options.sendDummyByte,
    };
    if (options.tunnelForward) {
        return new AdbScrcpyForwardConnection(adb, connectionOptions);
    } else {
        return new AdbScrcpyReverseConnection(adb, connectionOptions);
    }
}
