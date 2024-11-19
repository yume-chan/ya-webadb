import type { Adb } from "@yume-chan/adb";
import type {
    ScrcpyDisplay,
    ScrcpyEncoder,
    ScrcpyOptionsInit1_22,
} from "@yume-chan/scrcpy";

import type { AdbScrcpyConnection } from "../connection.js";

import { AdbScrcpyOptions1_16 } from "./1_16.js";
import { AdbScrcpyOptions } from "./types.js";

export class AdbScrcpyOptions1_22 extends AdbScrcpyOptions<
    // Only pick options that are used in this class,
    // so changes in `ScrcpyOptionsInitX_XX` won't affect type assignability with this class
    Pick<ScrcpyOptionsInit1_22, "tunnelForward" | "control" | "sendDummyByte">
> {
    override getEncoders(
        adb: Adb,
        path: string,
        version: string,
    ): Promise<ScrcpyEncoder[]> {
        return AdbScrcpyOptions1_16.getEncoders(adb, path, version, this);
    }

    override getDisplays(
        adb: Adb,
        path: string,
        version: string,
    ): Promise<ScrcpyDisplay[]> {
        return AdbScrcpyOptions1_16.getDisplays(adb, path, version, this);
    }

    override createConnection(adb: Adb): AdbScrcpyConnection {
        return AdbScrcpyOptions1_16.createConnection(
            adb,
            {
                scid: -1, // Not Supported
                video: true, // Always enabled
                audio: false, // Not Supported
                control: this.value.control,
                sendDummyByte: this.value.sendDummyByte,
            },
            this.value.tunnelForward,
        );
    }
}
