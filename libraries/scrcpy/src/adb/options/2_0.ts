// cspell:ignore scid

import type { ScrcpyOptionsInit2_0 } from "../../options/index.js";
import type { AdbScrcpyConnectionOptions } from "../connection.js";

import { AdbScrcpyOptions1_22 } from "./1_22.js";

export class AdbScrcpyOptions2_0<
    T extends ScrcpyOptionsInit2_0 = ScrcpyOptionsInit2_0
> extends AdbScrcpyOptions1_22<T> {
    protected override getConnectionOptions(): AdbScrcpyConnectionOptions {
        const defaults = this.getDefaultValues();
        return Object.assign(super.getConnectionOptions(), {
            scid: this.value.scid?.value ?? defaults.scid!.value,
        } satisfies Partial<AdbScrcpyConnectionOptions>);
    }
}
