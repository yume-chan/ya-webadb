import Struct from "@yume-chan/struct";

import {
    ScrcpyInjectScrollControlMessage1_16,
    ScrcpyScrollController1_16,
} from "../1_16/index.js";

export const ScrcpyInjectScrollControlMessage1_22 = new Struct()
    .concat(ScrcpyInjectScrollControlMessage1_16)
    .int32("buttons");

export type ScrcpyInjectScrollControlMessage1_22 =
    (typeof ScrcpyInjectScrollControlMessage1_22)["TInit"];

export class ScrcpyScrollController1_22 extends ScrcpyScrollController1_16 {
    public override serializeScrollMessage(
        message: ScrcpyInjectScrollControlMessage1_22
    ): Uint8Array | undefined {
        const processed = this.processMessage(message);
        if (!processed) {
            return undefined;
        }

        return ScrcpyInjectScrollControlMessage1_22.serialize(processed);
    }
}
