import type { Adb } from "@yume-chan/adb";
import type { ScrcpyDisplay, ScrcpyEncoder } from "@yume-chan/scrcpy";
import { ScrcpyOptions } from "@yume-chan/scrcpy";

import type { AdbScrcpyConnection } from "../connection.js";

export abstract class AdbScrcpyOptions<
    T extends object,
> extends ScrcpyOptions<T> {
    #base: ScrcpyOptions<T>;

    override get defaults(): Required<T> {
        return this.#base.defaults;
    }

    constructor(base: ScrcpyOptions<T>) {
        super(
            // HACK: `ScrcpyOptions`'s constructor requires a constructor for the base class,
            // but we need to pass an instance here.
            // A normal `function` can be used as a constructor, and constructors can return
            // any object to override the default return value.
            function () {
                return base;
            } as never,
            // HACK: `base.value` contains `SkipDefaultMark`, so it will be used as is,
            // and `defaults` parameter is not used.
            base.value,
            {} as Required<T>,
        );
        this.#base = base;
    }

    serialize(): string[] {
        return this.#base.serialize();
    }

    abstract getEncoders(
        adb: Adb,
        path: string,
        version: string,
    ): Promise<ScrcpyEncoder[]>;

    abstract getDisplays(
        adb: Adb,
        path: string,
        version: string,
    ): Promise<ScrcpyDisplay[]>;

    abstract createConnection(adb: Adb): AdbScrcpyConnection;
}
