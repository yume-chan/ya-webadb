import type { Adb, AdbNoneProtocolSpawner } from "@yume-chan/adb";
import type {
    ScrcpyDisplay,
    ScrcpyEncoder,
    ScrcpyOptions,
} from "@yume-chan/scrcpy";
import { ScrcpyOptionsWrapper } from "@yume-chan/scrcpy";

import type { AdbScrcpyConnection } from "./connection.js";

export abstract class AdbScrcpyOptions<
    T extends object,
> extends ScrcpyOptionsWrapper<T> {
    #spawner: AdbNoneProtocolSpawner | undefined;
    get spawner() {
        return this.#spawner;
    }

    constructor(base: ScrcpyOptions<T>, spawner?: AdbNoneProtocolSpawner) {
        super(base);
        this.#spawner = spawner;
    }

    abstract getEncoders(adb: Adb, path: string): Promise<ScrcpyEncoder[]>;

    abstract getDisplays(adb: Adb, path: string): Promise<ScrcpyDisplay[]>;

    abstract createConnection(adb: Adb): AdbScrcpyConnection;
}
