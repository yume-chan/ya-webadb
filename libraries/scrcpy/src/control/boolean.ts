import type { StructInit } from "@yume-chan/struct";
import { struct, u8 } from "@yume-chan/struct";

export const BooleanControlMessage = struct(
    { type: u8, value: u8<boolean>() },
    { littleEndian: false },
);

export type BooleanControlMessage = StructInit<typeof BooleanControlMessage>;
