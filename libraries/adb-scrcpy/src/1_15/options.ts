import type { Adb, ProcessSpawner } from "@yume-chan/adb";
import type { ScrcpyDisplay, ScrcpyEncoder } from "@yume-chan/scrcpy";
import { ScrcpyOptions1_15 } from "@yume-chan/scrcpy";

import type { AdbScrcpyConnection } from "../connection.js";
import { AdbScrcpyOptions } from "../types.js";

import { createConnection, getDisplays, getEncoders } from "./impl/index.js";

export class AdbScrcpyOptions1_15 extends AdbScrcpyOptions<ScrcpyOptions1_15.Init> {
    constructor(
        init: ScrcpyOptions1_15.Init,
        metadata: { version?: string; spawner?: ProcessSpawner | undefined },
    ) {
        super(new ScrcpyOptions1_15(init, metadata.version), metadata.spawner);
    }

    override getEncoders(adb: Adb, path: string): Promise<ScrcpyEncoder[]> {
        return getEncoders(adb, path, this);
    }

    override getDisplays(adb: Adb, path: string): Promise<ScrcpyDisplay[]> {
        return getDisplays(adb, path, this);
    }

    override createConnection(adb: Adb): AdbScrcpyConnection {
        return createConnection(adb, this.value);
    }
}

export namespace AdbScrcpyOptions1_15 {
    export type Init = ScrcpyOptions1_15.Init;
}
