import type { ScrcpyScrollController } from "../1_16/index.js";
import type { ScrcpyOptionsInit1_24 } from "../1_24.js";
import { ScrcpyOptions1_24 } from "../1_24.js";

import { ScrcpyScrollController1_25 } from "./scroll.js";

export class ScrcpyOptions1_25<
    T extends ScrcpyOptionsInit1_24 = ScrcpyOptionsInit1_24
> extends ScrcpyOptions1_24<T> {
    public override getScrollController(): ScrcpyScrollController {
        return new ScrcpyScrollController1_25();
    }
}
