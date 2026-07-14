import type { Adb, AdbNoneProtocolSpawner } from "@yume-chan/adb";
import type { ScrcpyDisplay, ScrcpyEncoder } from "@yume-chan/scrcpy";
import { ScrcpyOptions2_1 } from "@yume-chan/scrcpy";

import type { AdbScrcpyClientOptions } from "../client-options.js";
import type { AdbScrcpyConnection } from "../connection.js";
import type {
    AdbScrcpyOptions,
    AdbScrcpyOptionsGetEncoders,
} from "../types.js";

import { createConnection, getDisplays, getEncoders } from "./impl/index.js";

export class AdbScrcpyOptions2_1<
    TInit extends ScrcpyOptions2_1.Init = ScrcpyOptions2_1.Init,
>
    extends ScrcpyOptions2_1<TInit>
    implements
        AdbScrcpyOptions<ScrcpyOptions2_1.Value<TInit>>,
        AdbScrcpyOptionsGetEncoders
{
    readonly version: string;

    readonly spawner: AdbNoneProtocolSpawner | undefined;

    constructor(init: TInit, clientOptions?: AdbScrcpyClientOptions) {
        super(init);

        this.version = clientOptions?.version ?? "2.1";
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

export namespace AdbScrcpyOptions2_1 {
    export type Init = ScrcpyOptions2_1.Init;
}
