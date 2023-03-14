import { ScrcpyOptions1_21 } from "./1_21.js";
import type { ScrcpyOptionsInit1_23 } from "./1_23.js";
import { SCRCPY_OPTIONS_DEFAULT_1_23, ScrcpyOptions1_23 } from "./1_23.js";
import { ScrcpyOptionsBase } from "./types.js";

export interface ScrcpyOptionsInit1_24 extends ScrcpyOptionsInit1_23 {
    powerOn?: boolean;
}

export const SCRCPY_OPTIONS_DEFAULT_1_24 = {
    ...SCRCPY_OPTIONS_DEFAULT_1_23,
    powerOn: true,
} as const satisfies Required<ScrcpyOptionsInit1_24>;

export class ScrcpyOptions1_24 extends ScrcpyOptionsBase<
    ScrcpyOptionsInit1_24,
    ScrcpyOptions1_23
> {
    public constructor(init: ScrcpyOptionsInit1_24) {
        super(new ScrcpyOptions1_23(init), {
            ...SCRCPY_OPTIONS_DEFAULT_1_24,
            ...init,
        });
    }

    public override getDefaults(): Required<ScrcpyOptionsInit1_24> {
        return SCRCPY_OPTIONS_DEFAULT_1_24;
    }

    public override serialize(): string[] {
        return ScrcpyOptions1_21.serialize(this.value, this.getDefaults());
    }
}
