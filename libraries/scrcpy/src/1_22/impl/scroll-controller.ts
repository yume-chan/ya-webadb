import type { StructInit } from "@yume-chan/struct";
import { s32, struct } from "@yume-chan/struct";

import type { ScrcpyScrollController } from "../../base/index.js";
import type { ScrcpyInjectScrollControlMessage } from "../../latest.js";

import { PrevImpl } from "./prev.js";

export const InjectScrollControlMessage = /* #__PURE__ */ (() =>
    struct(
        {
            ...PrevImpl.InjectScrollControlMessage.fields,
            buttons: s32,
        },
        { littleEndian: false },
    ))();

export type InjectScrollControlMessage = StructInit<
    typeof InjectScrollControlMessage
>;

export class ScrollController extends PrevImpl.ScrollController {
    override serializeScrollMessage(
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
