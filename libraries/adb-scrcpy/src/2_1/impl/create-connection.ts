import type { Adb } from "@yume-chan/adb";
import type { ScrcpyOptions2_1 } from "@yume-chan/scrcpy";
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
            ScrcpyOptions2_1.Init<boolean>,
            | "tunnelForward"
            | "control"
            | "sendDummyByte"
            | "scid"
            | "audio"
            | "video"
        >
    >,
): AdbScrcpyConnection {
    const connectionOptions: AdbScrcpyConnectionOptions = {
        scid: toScrcpyOptionValue(options.scid, undefined),
        video: options.video,
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
