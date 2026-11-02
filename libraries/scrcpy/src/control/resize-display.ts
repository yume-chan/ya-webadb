import type { StructInit } from "@yume-chan/struct";
import { struct, u16, u8 } from "@yume-chan/struct";

export const ScrcpyResizeDisplayControlMessage = struct(
    {
        // value of `type` can change between versions
        type: u8,
        width: u16,
        height: u16,
    },
    { littleEndian: false },
);

export type ScrcpyResizeDisplayControlMessage = StructInit<
    typeof ScrcpyResizeDisplayControlMessage
>;
