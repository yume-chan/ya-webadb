import type { Adb, AdbNoneProtocolSpawner } from "@yume-chan/adb";
import type { ScrcpyDisplay, ScrcpyEncoder } from "@yume-chan/scrcpy";
import { ScrcpyOptions3_0 } from "@yume-chan/scrcpy";

import {
    createConnection,
    getDisplays,
    getEncoders,
} from "./2_1/impl/index.js";
import type { AdbScrcpyClientOptions } from "./client-options.js";
import type { AdbScrcpyConnection } from "./connection.js";
import type { AdbScrcpyOptions, AdbScrcpyOptionsGetEncoders } from "./types.js";

export class AdbScrcpyOptions3_0<
    TInit extends ScrcpyOptions3_0.Init = ScrcpyOptions3_0.Init,
>
    extends ScrcpyOptions3_0<TInit>
    implements
        AdbScrcpyOptions<ScrcpyOptions3_0.Value<TInit>>,
        AdbScrcpyOptionsGetEncoders
{
    readonly version: string;

    readonly spawner: AdbNoneProtocolSpawner | undefined;

    constructor(init: TInit, clientOptions?: AdbScrcpyClientOptions) {
        super(init);

        this.version = clientOptions?.version ?? "3.0";
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

export namespace AdbScrcpyOptions3_0 {
    export type Init = ScrcpyOptions3_0.Init;
}
