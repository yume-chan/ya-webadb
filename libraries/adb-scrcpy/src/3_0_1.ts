import type { Adb } from "@yume-chan/adb";
import type { ScrcpyDisplay, ScrcpyEncoder } from "@yume-chan/scrcpy";
import { ScrcpyOptions3_0_1 } from "@yume-chan/scrcpy";

import {
    createConnection,
    getDisplays,
    getEncoders,
} from "./2_1/impl/index.js";
import type { AdbScrcpyClientOptions } from "./client-options.js";
import type { AdbScrcpyConnection } from "./connection.js";
import { AdbScrcpyOptions } from "./types.js";

export class AdbScrcpyOptions3_0_1<
    TVideo extends boolean,
> extends AdbScrcpyOptions<ScrcpyOptions3_0_1.Init<TVideo>> {
    constructor(
        init: ScrcpyOptions3_0_1.Init<TVideo>,
        clientOptions?: AdbScrcpyClientOptions,
    ) {
        super(
            new ScrcpyOptions3_0_1(init, clientOptions?.version),
            clientOptions?.spawner,
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

export namespace AdbScrcpyOptions3_0_1 {
    export type Init<TVideo extends boolean = boolean> =
        ScrcpyOptions3_0_1.Init<TVideo>;
}
