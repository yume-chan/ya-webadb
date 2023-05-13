import type { Adb } from "@yume-chan/adb";
import type {
    ScrcpyDisplay,
    ScrcpyEncoder,
    ScrcpyOptions,
} from "@yume-chan/scrcpy";
import { ScrcpyOptionsBase } from "@yume-chan/scrcpy";

import type { AdbScrcpyConnection } from "../connection.js";

export interface AdbScrcpyOptions<T extends object> extends ScrcpyOptions<T> {
    /**
     * Allows the client to forcefully enable forward tunnel mode
     * when reverse tunnel fails.
     */
    tunnelForwardOverride: boolean;

    getEncoders(
        adb: Adb,
        path: string,
        version: string
    ): Promise<ScrcpyEncoder[]>;

    getDisplays(
        adb: Adb,
        path: string,
        version: string
    ): Promise<ScrcpyDisplay[]>;

    createConnection(adb: Adb): AdbScrcpyConnection;
}

export abstract class AdbScrcpyOptionsBase<T extends object>
    extends ScrcpyOptionsBase<T, ScrcpyOptions<T>>
    implements AdbScrcpyOptions<T>
{
    public override get defaults(): Required<T> {
        return this._base.defaults;
    }

    public tunnelForwardOverride = false;

    public constructor(base: ScrcpyOptions<T>) {
        super(base, base.value);
    }

    public serialize(): string[] {
        return this._base.serialize();
    }

    public abstract getEncoders(
        adb: Adb,
        path: string,
        version: string
    ): Promise<ScrcpyEncoder[]>;

    public abstract getDisplays(
        adb: Adb,
        path: string,
        version: string
    ): Promise<ScrcpyDisplay[]>;

    public abstract createConnection(adb: Adb): AdbScrcpyConnection;
}
