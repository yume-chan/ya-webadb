import type { StructInit } from "@yume-chan/struct";
import { string, struct, u8 } from "@yume-chan/struct";

export const ScrcpyStartAppControlMessage = struct(
    {
        // value of `type` can change between versions
        type: u8,
        name: string(u8),
    },
    { littleEndian: false },
);

export type ScrcpyStartAppControlMessage = StructInit<
    typeof ScrcpyStartAppControlMessage
>;
