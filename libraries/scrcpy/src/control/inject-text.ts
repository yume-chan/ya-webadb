import type { StructInit } from "@yume-chan/struct";
import { string, struct, u32, u8 } from "@yume-chan/struct";

export const ScrcpyInjectTextControlMessage = struct(
    {
        // value of `type` can change between versions
        type: u8,
        text: string(u32),
    },
    { littleEndian: false },
);

export type ScrcpyInjectTextControlMessage = StructInit<
    typeof ScrcpyInjectTextControlMessage
>;
