import type { StructInit } from "@yume-chan/struct";
import { buffer, struct, u16, u8 } from "@yume-chan/struct";

import { ScrcpyControlMessageType } from "../base/index.js";

export const ScrcpyUHidInputControlMessage = /* #__PURE__ */ (() =>
    struct(
        {
            type: u8(ScrcpyControlMessageType.UHidInput),
            id: u16,
            data: buffer(u16),
        },
        { littleEndian: false },
    ))();

export type ScrcpyUHidInputControlMessage = StructInit<
    typeof ScrcpyUHidInputControlMessage
>;

export const ScrcpyUHidDestroyControlMessage = struct(
    { type: u8, id: u16 },
    { littleEndian: false },
);

export type ScrcpyUHidDestroyControlMessage = StructInit<
    typeof ScrcpyUHidDestroyControlMessage
>;
