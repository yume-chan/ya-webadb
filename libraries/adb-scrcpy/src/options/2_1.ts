import type { Adb } from "@yume-chan/adb";
import type {
    ScrcpyDisplay,
    ScrcpyEncoder,
    ScrcpyOptionsInit2_1,
} from "@yume-chan/scrcpy";

import type { AdbScrcpyConnection } from "../connection.js";

import { AdbScrcpyOptions1_16 } from "./1_16.js";
import { AdbScrcpyOptions2_0 } from "./2_0.js";
import { AdbScrcpyOptionsBase } from "./types.js";

export class AdbScrcpyOptions2_1 extends AdbScrcpyOptionsBase<ScrcpyOptionsInit2_1> {
    override async getEncoders(
        adb: Adb,
        path: string,
        version: string,
    ): Promise<ScrcpyEncoder[]> {
        return AdbScrcpyOptions2_0.getEncoders(adb, path, version, this);
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
                scid: this.value.scid.value,
                video: this.value.video,
                audio: this.value.audio,
                control: this.value.control,
                sendDummyByte: this.value.sendDummyByte,
            },
            this.tunnelForwardOverride || this.value.tunnelForward,
        );
    }
}
