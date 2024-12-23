import type { Adb } from "@yume-chan/adb";
import type { ScrcpyDisplay, ScrcpyEncoder } from "@yume-chan/scrcpy";
import { ScrcpyOptionsWrapper } from "@yume-chan/scrcpy";

import type { AdbScrcpyConnection } from "../connection.js";

export abstract class AdbScrcpyOptions<
    T extends object,
> extends ScrcpyOptionsWrapper<T> {
    abstract getEncoders(adb: Adb, path: string): Promise<ScrcpyEncoder[]>;

    abstract getDisplays(adb: Adb, path: string): Promise<ScrcpyDisplay[]>;

    abstract createConnection(adb: Adb): AdbScrcpyConnection;
}
