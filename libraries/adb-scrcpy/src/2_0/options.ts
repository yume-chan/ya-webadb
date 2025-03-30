import type { Adb, AdbNoneProtocolSpawner } from "@yume-chan/adb";
import type { ScrcpyDisplay, ScrcpyEncoder } from "@yume-chan/scrcpy";
import { ScrcpyOptions2_0 } from "@yume-chan/scrcpy";

import type { AdbScrcpyConnection } from "../connection.js";
import { AdbScrcpyOptions } from "../types.js";

import { createConnection, getDisplays, getEncoders } from "./impl/index.js";

export class AdbScrcpyOptions2_0 extends AdbScrcpyOptions<ScrcpyOptions2_0.Init> {
    constructor(
        init: ScrcpyOptions2_0.Init,
        metadata?: {
            version?: string;
            spawner?: AdbNoneProtocolSpawner | undefined;
        },
    ) {
        super(new ScrcpyOptions2_0(init, metadata?.version), metadata?.spawner);
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

export namespace AdbScrcpyOptions2_0 {
    export type Init = ScrcpyOptions2_0.Init;
}
