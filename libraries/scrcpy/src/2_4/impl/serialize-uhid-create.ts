import type { StructInit } from "@yume-chan/struct";
import { buffer, struct, u16, u8 } from "@yume-chan/struct";

import type { ScrcpyUHidCreateControlMessage } from "../../latest.js";

export const UHidCreateControlMessage = struct(
    {
        type: u8,
        id: u16,
        data: buffer(u16),
    },
    { littleEndian: false },
);

export type UHidCreateControlMessage = StructInit<
    typeof UHidCreateControlMessage
>;

export function serializeUHidCreateControlMessage(
    message: ScrcpyUHidCreateControlMessage,
) {
    return UHidCreateControlMessage.serialize(message);
}
