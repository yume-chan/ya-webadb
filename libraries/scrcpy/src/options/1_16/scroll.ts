import Struct from "@yume-chan/struct";

import type { ScrcpyInjectScrollControlMessage } from "../../control/index.js";

export interface ScrcpyScrollController {
    serializeScrollMessage(
        message: ScrcpyInjectScrollControlMessage
    ): Uint8Array | undefined;
}

export const ScrcpyInjectScrollControlMessage1_16 = new Struct()
    .uint8("type")
    .uint32("pointerX")
    .uint32("pointerY")
    .uint16("screenWidth")
    .uint16("screenHeight")
    .int32("scrollX")
    .int32("scrollY");

/**
 * Old version of Scrcpy server only supports integer values for scroll.
 *
 * Accumulate scroll values and send scroll message when accumulated value
 * reaches 1 or -1.
 */
export class ScrcpyScrollController1_16 implements ScrcpyScrollController {
    private accumulatedX = 0;
    private accumulatedY = 0;

    protected processMessage(
        message: ScrcpyInjectScrollControlMessage
    ): ScrcpyInjectScrollControlMessage | undefined {
        this.accumulatedX += message.scrollX;
        this.accumulatedY += message.scrollY;

        let scrollX = 0;
        let scrollY = 0;
        if (this.accumulatedX >= 1) {
            scrollX = 1;
            this.accumulatedX = 0;
        } else if (this.accumulatedX <= -1) {
            scrollX = -1;
            this.accumulatedX = 0;
        }

        if (this.accumulatedY >= 1) {
            scrollY = 1;
            this.accumulatedY = 0;
        } else if (this.accumulatedY <= -1) {
            scrollY = -1;
            this.accumulatedY = 0;
        }

        if (scrollX === 0 && scrollY === 0) {
            return undefined;
        }

        message.scrollX = scrollX;
        message.scrollY = scrollY;
        return message;
    }

    public serializeScrollMessage(
        message: ScrcpyInjectScrollControlMessage
    ): Uint8Array | undefined {
        const processed = this.processMessage(message);
        if (!processed) {
            return undefined;
        }

        return ScrcpyInjectScrollControlMessage1_16.serialize(processed);
    }
}
