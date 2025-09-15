import type { Adb, AdbNoneProtocolSpawner } from "@yume-chan/adb";
import type { ScrcpyDisplay, ScrcpyEncoder } from "@yume-chan/scrcpy";
import { ScrcpyOptions3_3_2 } from "@yume-chan/scrcpy";

import {
    createConnection,
    getDisplays,
    getEncoders,
} from "./2_1/impl/index.js";
import type { AdbScrcpyClientOptions } from "./client-options.js";
import type { AdbScrcpyConnection } from "./connection.js";
import type { AdbScrcpyOptions, AdbScrcpyOptionsGetEncoders } from "./types.js";

export class AdbScrcpyOptions3_3_2<TVideo extends boolean>
    extends ScrcpyOptions3_3_2<TVideo>
    implements
        AdbScrcpyOptions<ScrcpyOptions3_3_2.Init<TVideo>>,
        AdbScrcpyOptionsGetEncoders
{
    readonly version: string;

    readonly spawner: AdbNoneProtocolSpawner | undefined;

    constructor(
        init: ScrcpyOptions3_3_2.Init<TVideo>,
        clientOptions?: AdbScrcpyClientOptions,
    ) {
        super(init);

        this.version = clientOptions?.version ?? "3.3.2";
        this.spawner = clientOptions?.spawner;
    }

    getEncoders(adb: Adb, path: string): Promise<ScrcpyEncoder[]> {
        return getEncoders(adb, path, this);
    }

    getDisplays(adb: Adb, path: string): Promise<ScrcpyDisplay[]> {
        return getDisplays(adb, path, this);
    }

    createConnection(adb: Adb): AdbScrcpyConnection {
        return createConnection(adb, this.value);
    }
}

export namespace AdbScrcpyOptions3_3_2 {
    export type Init<TVideo extends boolean = boolean> =
        ScrcpyOptions3_3_2.Init<TVideo>;
}
