import type { Adb, AdbNoneProtocolSpawner } from "@yume-chan/adb";
import type { ScrcpyDisplay, ScrcpyEncoder } from "@yume-chan/scrcpy";
import { ScrcpyOptions1_24 } from "@yume-chan/scrcpy";

import {
    createConnection,
    getDisplays,
    getEncoders,
} from "./1_22/impl/index.js";
import type { AdbScrcpyClientOptions } from "./client-options.js";
import type { AdbScrcpyConnection } from "./connection.js";
import type { AdbScrcpyOptions, AdbScrcpyOptionsGetEncoders } from "./types.js";

export class AdbScrcpyOptions1_24<
    TInit extends ScrcpyOptions1_24.Init = ScrcpyOptions1_24.Init,
>
    extends ScrcpyOptions1_24<TInit>
    implements
        AdbScrcpyOptions<ScrcpyOptions1_24.Value<TInit>>,
        AdbScrcpyOptionsGetEncoders
{
    readonly version: string;

    readonly spawner: AdbNoneProtocolSpawner | undefined;

    constructor(init: TInit, clientOptions?: AdbScrcpyClientOptions) {
        super(init);

        this.version = clientOptions?.version ?? "1.24";
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

export namespace AdbScrcpyOptions1_24 {
    export type Init = ScrcpyOptions1_24.Init;
}
