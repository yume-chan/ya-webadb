import type { ScrcpyScrollController } from "../1_16/index.js";
import { ScrcpyOptions1_21 } from "../1_21.js";
import type { ScrcpyOptionsInit1_24 } from "../1_24.js";
import { SCRCPY_OPTIONS_DEFAULT_1_24, ScrcpyOptions1_24 } from "../1_24.js";
import { ScrcpyOptionsBase } from "../types.js";

import { ScrcpyScrollController1_25 } from "./scroll.js";

export class ScrcpyOptions1_25 extends ScrcpyOptionsBase<
    ScrcpyOptionsInit1_24,
    ScrcpyOptions1_24
> {
    public constructor(init: ScrcpyOptionsInit1_24) {
        super(new ScrcpyOptions1_24(init), {
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

    public override createScrollController(): ScrcpyScrollController {
        return new ScrcpyScrollController1_25();
    }
}
