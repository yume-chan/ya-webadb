import type { StructInit } from "@yume-chan/struct";
import { buffer, string, struct, u16, u8 } from "@yume-chan/struct";

export const UHidCreateControlMessage = struct(
    {
        // value of `type` can change between versions
        type: u8,
        id: u16,
        name: string(u8),
        data: buffer(u16),
    },
    { littleEndian: false },
);

export type UHidCreateControlMessage = StructInit<
    typeof UHidCreateControlMessage
>;

export function serializeUHidCreateControlMessage(
    message: UHidCreateControlMessage,
) {
    return UHidCreateControlMessage.serialize(message);
}
