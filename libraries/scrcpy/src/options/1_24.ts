import type { ScrcpyOptionsInit1_23 } from "./1_23.js";
import { ScrcpyOptions1_23 } from "./1_23.js";

export interface ScrcpyOptionsInit1_24 extends ScrcpyOptionsInit1_23 {
    powerOn: boolean;
}

export class ScrcpyOptions1_24<
    T extends ScrcpyOptionsInit1_24 = ScrcpyOptionsInit1_24
> extends ScrcpyOptions1_23<T> {
    public constructor(init: Partial<ScrcpyOptionsInit1_24>) {
        super(init);
    }

    public override getDefaultValues(): T {
        return Object.assign(super.getDefaultValues(), {
            powerOn: true,
        } satisfies Omit<ScrcpyOptionsInit1_24, keyof ScrcpyOptionsInit1_23>);
    }
}
