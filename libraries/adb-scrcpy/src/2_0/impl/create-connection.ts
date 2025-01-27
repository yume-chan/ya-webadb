import type { Adb } from "@yume-chan/adb";
import type { ScrcpyOptions2_0 } from "@yume-chan/scrcpy";
import { toScrcpyOptionValue } from "@yume-chan/scrcpy";

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
            ScrcpyOptions2_0.Init,
            "tunnelForward" | "control" | "sendDummyByte" | "scid" | "audio"
        >
    >,
): AdbScrcpyConnection {
    const connectionOptions: AdbScrcpyConnectionOptions = {
        scid: toScrcpyOptionValue(options.scid, undefined),
        video: true, // Always enabled
        audio: options.audio,
        control: options.control,
        sendDummyByte: options.sendDummyByte,
    };
    if (options.tunnelForward) {
        return new AdbScrcpyForwardConnection(adb, connectionOptions);
    } else {
        return new AdbScrcpyReverseConnection(adb, connectionOptions);
    }
}
