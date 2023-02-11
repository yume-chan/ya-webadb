// cspell:ignore scid

import { type ScrcpyOptionsInit1_26 } from "../../options/index.js";
import { type AdbScrcpyConnectionOptions } from "../connection.js";

import { AdbScrcpyOptions1_22 } from "./1_22.js";

export class AdbScrcpyOptions1_26<
    T extends ScrcpyOptionsInit1_26 = ScrcpyOptionsInit1_26
> extends AdbScrcpyOptions1_22<T> {
    protected override getConnectionOptions(): AdbScrcpyConnectionOptions {
        const defaults = this.getDefaultValue();
        return Object.assign(super.getConnectionOptions(), {
            scid: this.value.scid?.value ?? defaults.scid.value,
        } satisfies Partial<AdbScrcpyConnectionOptions>);
    }
}
