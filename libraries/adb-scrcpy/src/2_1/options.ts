import type { Adb, ProcessSpawner } from "@yume-chan/adb";
import type { ScrcpyDisplay, ScrcpyEncoder } from "@yume-chan/scrcpy";
import { ScrcpyOptions2_1 } from "@yume-chan/scrcpy";

import {
    createConnection,
    getDisplays,
    getEncoders,
} from "../2_1/impl/index.js";
import type { AdbScrcpyConnection } from "../connection.js";
import { AdbScrcpyOptions } from "../types.js";

export class AdbScrcpyOptions2_1<
    TVideo extends boolean,
> extends AdbScrcpyOptions<ScrcpyOptions2_1.Init<TVideo>> {
    constructor(
        init: ScrcpyOptions2_1.Init<TVideo>,
        metadata: { version?: string; spawner?: ProcessSpawner | undefined },
    ) {
        super(new ScrcpyOptions2_1(init, metadata.version), metadata.spawner);
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

export namespace AdbScrcpyOptions2_1 {
    export type Init<TVideo extends boolean = boolean> =
        ScrcpyOptions2_1.Init<TVideo>;
}
