import type { ScrcpyOptionsInit1_22 } from "../../options/index.js";
import type { AdbScrcpyConnectionOptions } from "../connection.js";

import { AdbScrcpyOptions1_16 } from "./1_16.js";

export class AdbScrcpyOptions1_22<
    T extends ScrcpyOptionsInit1_22 = ScrcpyOptionsInit1_22
> extends AdbScrcpyOptions1_16<T> {
    protected override getConnectionOptions(): AdbScrcpyConnectionOptions {
        const defaults = this.getDefaultValues();
        return Object.assign(super.getConnectionOptions(), {
            control: this.value.control ?? defaults.control,
            sendDummyByte: this.value.sendDummyByte ?? defaults.sendDummyByte,
        } satisfies Partial<AdbScrcpyConnectionOptions>);
    }
}
