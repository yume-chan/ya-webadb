import type { Adb } from "@yume-chan/adb";

import type { ScrcpyOptions } from "../../options/index.js";
import { ScrcpyOptionsBase } from "../../options/index.js";
import type { AdbScrcpyConnection } from "../connection.js";

export interface AdbScrcpyOptions<T extends object> extends ScrcpyOptions<T> {
    tunnelForwardOverride: boolean;

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

    public abstract createConnection(adb: Adb): AdbScrcpyConnection;
}
