import type { Adb, AdbNoneProtocolSpawner } from "@yume-chan/adb";
import type { ScrcpyDisplay, ScrcpyEncoder } from "@yume-chan/scrcpy";
import { ScrcpyOptions1_22 } from "@yume-chan/scrcpy";

import type { AdbScrcpyClientOptions } from "../client-options.js";
import type { AdbScrcpyConnection } from "../connection.js";
import type {
    AdbScrcpyOptions,
    AdbScrcpyOptionsGetEncoders,
} from "../types.js";

import { createConnection, getDisplays, getEncoders } from "./impl/index.js";

export class AdbScrcpyOptions1_22<
    TInit extends ScrcpyOptions1_22.Init = ScrcpyOptions1_22.Init,
>
    extends ScrcpyOptions1_22<TInit>
    implements
        AdbScrcpyOptions<ScrcpyOptions1_22.Value<TInit>>,
        AdbScrcpyOptionsGetEncoders
{
    readonly version: string;

    readonly spawner: AdbNoneProtocolSpawner | undefined;

    constructor(init: TInit, clientOptions?: AdbScrcpyClientOptions) {
        super(init);

        this.version = clientOptions?.version ?? "1.22";
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

export namespace AdbScrcpyOptions1_22 {
    export type Init = ScrcpyOptions1_22.Init;
}
