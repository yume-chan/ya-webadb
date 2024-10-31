import type { StructInit } from "@yume-chan/struct";
import { s32, Struct } from "@yume-chan/struct";

import {
    ScrcpyInjectScrollControlMessage1_16,
    ScrcpyScrollController1_16,
} from "../1_16/index.js";

export const ScrcpyInjectScrollControlMessage1_22 = new Struct(
    { ...ScrcpyInjectScrollControlMessage1_16.fields, buttons: s32 },
    { littleEndian: false },
);

export type ScrcpyInjectScrollControlMessage1_22 = StructInit<
    typeof ScrcpyInjectScrollControlMessage1_22
>;

export class ScrcpyScrollController1_22 extends ScrcpyScrollController1_16 {
    override serializeScrollMessage(
        message: ScrcpyInjectScrollControlMessage1_22,
    ): Uint8Array | undefined {
        const processed = this.processMessage(message);
        if (!processed) {
            return undefined;
        }

        return ScrcpyInjectScrollControlMessage1_22.serialize(processed);
    }
}
