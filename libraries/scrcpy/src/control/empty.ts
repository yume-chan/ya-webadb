import type { StructInit } from "@yume-chan/struct";
import { struct, u8 } from "@yume-chan/struct";

export const EmptyControlMessage = struct(
    { type: u8 },
    { littleEndian: false },
);

export type EmptyControlMessage = StructInit<typeof EmptyControlMessage>;
