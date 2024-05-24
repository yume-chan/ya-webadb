import type { ScrcpyScrollController } from "../1_16/index.js";
import { ScrcpyOptions1_21 } from "../1_21.js";
import type { ScrcpyOptionsInit1_24 } from "../1_24.js";
import { ScrcpyOptions1_24 } from "../1_24.js";
import { ScrcpyOptions } from "../types.js";

import { ScrcpyScrollController1_25 } from "./scroll.js";

export class ScrcpyOptions1_25 extends ScrcpyOptions<ScrcpyOptionsInit1_24> {
    override get defaults(): Required<ScrcpyOptionsInit1_24> {
        return ScrcpyOptions1_24.DEFAULTS;
    }

    constructor(init: ScrcpyOptionsInit1_24) {
        super(ScrcpyOptions1_24, init, ScrcpyOptions1_24.DEFAULTS);
    }

    override serialize(): string[] {
        return ScrcpyOptions1_21.serialize(this.value, this.defaults);
    }

    override createScrollController(): ScrcpyScrollController {
        return new ScrcpyScrollController1_25();
    }
}
