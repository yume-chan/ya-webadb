import type { Adb, AdbNoneProtocolSpawner } from "@yume-chan/adb";
import type { ScrcpyDisplay, ScrcpyEncoder } from "@yume-chan/scrcpy";
import { ScrcpyOptions2_7 } from "@yume-chan/scrcpy";

import {
    createConnection,
    getDisplays,
    getEncoders,
} from "./2_1/impl/index.js";
import type { AdbScrcpyConnection } from "./connection.js";
import { AdbScrcpyOptions } from "./types.js";

export class AdbScrcpyOptions2_7<
    TVideo extends boolean,
> extends AdbScrcpyOptions<ScrcpyOptions2_7.Init<TVideo>> {
    constructor(
        init: ScrcpyOptions2_7.Init<TVideo>,
        metadata?: {
            version?: string;
            spawner?: AdbNoneProtocolSpawner | undefined;
        },
    ) {
        super(new ScrcpyOptions2_7(init, metadata?.version), metadata?.spawner);
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

export namespace AdbScrcpyOptions2_7 {
    export type Init<TVideo extends boolean = boolean> =
        ScrcpyOptions2_7.Init<TVideo>;
}
