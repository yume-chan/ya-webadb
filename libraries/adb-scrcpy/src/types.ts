import type { Adb, AdbNoneProtocolSpawner } from "@yume-chan/adb";
import type {
    ScrcpyDisplay,
    ScrcpyEncoder,
    ScrcpyOptions,
    ScrcpyOptionsListEncoders,
} from "@yume-chan/scrcpy";

import type { AdbScrcpyConnection } from "./connection.js";

export interface AdbScrcpyOptions<T extends object> extends ScrcpyOptions<T> {
    readonly version: string;

    readonly spawner: AdbNoneProtocolSpawner | undefined;

    getDisplays(adb: Adb, path: string): Promise<ScrcpyDisplay[]>;

    createConnection(adb: Adb): AdbScrcpyConnection;
}

export interface AdbScrcpyOptionsGetEncoders extends ScrcpyOptionsListEncoders {
    getEncoders(adb: Adb, path: string): Promise<ScrcpyEncoder[]>;
}
