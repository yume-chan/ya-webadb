import type { StructInit } from "@yume-chan/struct";
import { s32, struct, u16, u32, u8 } from "@yume-chan/struct";

import type { ScrcpyScrollController } from "../../base/index.js";
import type { ScrcpyInjectScrollControlMessage } from "../../latest.js";

export const InjectScrollControlMessage = struct(
    {
        type: u8,
        pointerX: u32,
        pointerY: u32,
        videoWidth: u16,
        videoHeight: u16,
        scrollX: s32,
        scrollY: s32,
    },
    { littleEndian: false },
);

export type InjectScrollControlMessage = StructInit<
    typeof InjectScrollControlMessage
>;

/**
 * Old version of Scrcpy server only supports integer values for scroll.
 *
 * Accumulate scroll values and send scroll message when accumulated value
 * reaches 1 or -1.
 */
export class ScrollController implements ScrcpyScrollController {
    #accumulatedX = 0;
    #accumulatedY = 0;

    protected processMessage(
        message: ScrcpyInjectScrollControlMessage,
    ): ScrcpyInjectScrollControlMessage | undefined {
        // Ref https://github.com/libsdl-org/SDL/blob/878ea48b607f23e4ec8c12d1395b86ab529e30d0/src/events/SDL_mouse.c#L897-L914

        if (message.scrollX) {
            if (Math.sign(message.scrollX) !== Math.sign(this.#accumulatedX)) {
                this.#accumulatedX = message.scrollX;
            } else {
                this.#accumulatedX += message.scrollX;
            }
        }

        if (message.scrollY) {
            if (Math.sign(message.scrollY) !== Math.sign(this.#accumulatedY)) {
                this.#accumulatedY = message.scrollY;
            } else {
                this.#accumulatedY += message.scrollY;
            }
        }

        const integerX = this.#accumulatedX | 0;
        this.#accumulatedX -= integerX;

        const integerY = this.#accumulatedY | 0;
        this.#accumulatedY -= integerY;

        if (integerX === 0 && integerY === 0) {
            return undefined;
        }

        message.scrollX = integerX;
        message.scrollY = integerY;
        return message;
    }

    serializeScrollMessage(
        message: ScrcpyInjectScrollControlMessage,
    ): Uint8Array | undefined {
        const processed = this.processMessage(message);
        if (!processed) {
            return undefined;
        }

        return InjectScrollControlMessage.serialize(processed);
    }
}

export function createScrollController(): ScrcpyScrollController {
    return new ScrollController();
}
