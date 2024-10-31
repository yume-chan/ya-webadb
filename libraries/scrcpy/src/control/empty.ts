import type { StructInit } from "@yume-chan/struct";
import { Struct, u8 } from "@yume-chan/struct";

export const EmptyControlMessage = new Struct(
    { type: u8 },
    { littleEndian: false },
);

export type EmptyControlMessage = StructInit<typeof EmptyControlMessage>;
