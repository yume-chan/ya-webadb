import type { Adb, AdbNoneProtocolSpawner } from "@yume-chan/adb";
import type { ScrcpyDisplay } from "@yume-chan/scrcpy";
import { ScrcpyOptions1_15_1 } from "@yume-chan/scrcpy";

import { createConnection, getDisplays } from "./1_15/impl/index.js";
import type { AdbScrcpyClientOptions } from "./client-options.js";
import type { AdbScrcpyConnection } from "./connection.js";
import type { AdbScrcpyOptions } from "./types.js";

export class AdbScrcpyOptions1_15_1
    extends ScrcpyOptions1_15_1
    implements AdbScrcpyOptions<ScrcpyOptions1_15_1.Init>
{
    readonly version: string;

    readonly spawner: AdbNoneProtocolSpawner | undefined;

    constructor(
        init: ScrcpyOptions1_15_1.Init,
        clientOptions?: AdbScrcpyClientOptions,
    ) {
        super(init);

        this.version = clientOptions?.version ?? "1.15.1";
        this.spawner = clientOptions?.spawner;
    }

    getDisplays(adb: Adb, path: string): Promise<ScrcpyDisplay[]> {
        return getDisplays(adb, path, this);
    }

    createConnection(adb: Adb): AdbScrcpyConnection {
        return createConnection(adb, this.value);
    }
}

export namespace AdbScrcpyOptions1_15_1 {
    export type Init = ScrcpyOptions1_15_1.Init;
}
