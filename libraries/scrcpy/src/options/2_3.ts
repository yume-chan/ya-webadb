import { ScrcpyOptions1_21 } from "./1_21.js";
import { omit } from "./2_0.js";
import { ScrcpyOptions2_2, type ScrcpyOptionsInit2_2 } from "./2_2.js";
import { ScrcpyOptionsBase } from "./types.js";

export interface ScrcpyOptionsInit2_3
    extends Omit<ScrcpyOptionsInit2_2, "audioCodec"> {
    audioCodec?: "raw" | "opus" | "aac" | "flac" | undefined;
}

export class ScrcpyOptions2_3 extends ScrcpyOptionsBase<
    ScrcpyOptionsInit2_3,
    ScrcpyOptions2_2
> {
    static readonly DEFAULTS = {
        ...ScrcpyOptions2_2.DEFAULTS,
    } as const satisfies Required<ScrcpyOptionsInit2_3>;

    override get defaults(): Required<ScrcpyOptionsInit2_3> {
        return ScrcpyOptions2_3.DEFAULTS;
    }

    constructor(init: ScrcpyOptionsInit2_3) {
        super(new ScrcpyOptions2_2(omit(init, ["audioCodec"])), {
            ...ScrcpyOptions2_3.DEFAULTS,
            ...init,
        });
    }

    override serialize(): string[] {
        return ScrcpyOptions1_21.serialize(this.value, this.defaults);
    }
}
