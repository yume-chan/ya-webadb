import type { Adb } from "@yume-chan/adb";
import type {
    ScrcpyDisplay,
    ScrcpyEncoder,
    ScrcpyOptions2_1Impl,
} from "@yume-chan/scrcpy";
import { toScrcpyOptionValue } from "@yume-chan/scrcpy";

import type { AdbScrcpyConnection } from "../connection.js";

import { AdbScrcpyOptions1_16 } from "./1_16.js";
import { AdbScrcpyOptions2_0 } from "./2_0.js";
import { AdbScrcpyOptions } from "./types.js";

export class AdbScrcpyOptions2_1 extends AdbScrcpyOptions<
    // Only pick options that are used in this class,
    // so changes in `ScrcpyOptionsInitX_XX` won't affect type assignability with this class
    Pick<
        ScrcpyOptions2_1Impl.Init,
        | "tunnelForward"
        | "control"
        | "sendDummyByte"
        | "scid"
        | "audio"
        | "video"
    >
> {
    override async getEncoders(
        adb: Adb,
        path: string,
    ): Promise<ScrcpyEncoder[]> {
        return AdbScrcpyOptions2_0.getEncoders(adb, path, this);
    }

    override getDisplays(adb: Adb, path: string): Promise<ScrcpyDisplay[]> {
        return AdbScrcpyOptions1_16.getDisplays(adb, path, this);
    }

    override createConnection(adb: Adb): AdbScrcpyConnection {
        return AdbScrcpyOptions1_16.createConnection(
            adb,
            {
                scid: toScrcpyOptionValue(this.value.scid, undefined),
                video: this.value.video,
                audio: this.value.audio,
                control: this.value.control,
                sendDummyByte: this.value.sendDummyByte,
            },
            this.value.tunnelForward,
        );
    }
}
