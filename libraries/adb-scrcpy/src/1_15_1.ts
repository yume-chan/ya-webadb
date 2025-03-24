import type { Adb, ProcessSpawner } from "@yume-chan/adb";
import type { ScrcpyDisplay, ScrcpyEncoder } from "@yume-chan/scrcpy";
import { ScrcpyOptions1_15_1 } from "@yume-chan/scrcpy";

import {
    createConnection,
    getDisplays,
    getEncoders,
} from "./1_15/impl/index.js";
import type { AdbScrcpyConnection } from "./connection.js";
import { AdbScrcpyOptions } from "./types.js";

export class AdbScrcpyOptions1_15_1 extends AdbScrcpyOptions<ScrcpyOptions1_15_1.Init> {
    constructor(
        init: ScrcpyOptions1_15_1.Init,
        metadata: { version?: string; spawner?: ProcessSpawner | undefined },
    ) {
        super(
            new ScrcpyOptions1_15_1(init, metadata.version),
            metadata.spawner,
        );
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

export namespace AdbScrcpyOptions1_15_1 {
    export type Init = ScrcpyOptions1_15_1.Init;
}
