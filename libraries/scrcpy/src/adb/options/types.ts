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
    public override get value(): Required<T> {
        return this._base.value;
    }

    public override set value(value: Required<T>) {
        this._base.value = value;
    }

    public tunnelForwardOverride = false;

    public constructor(base: ScrcpyOptions<T>) {
        super(base, base.value);
    }

    public getDefaults(): Required<T> {
        return this._base.getDefaults();
    }

    public serialize(): string[] {
        return this._base.serialize();
    }

    public abstract createConnection(adb: Adb): AdbScrcpyConnection;
}
