import type { StructInit } from "@yume-chan/struct";
import { buffer, string, struct, u16, u8 } from "@yume-chan/struct";

import { ScrcpyControlMessageType } from "../../base/control-message-type.js";
import type { ScrcpyUHidCreateControlMessage } from "../../latest.js";

export const UHidCreateControlMessage = /* #__PURE__ */ (() =>
    struct(
        {
            type: u8(ScrcpyControlMessageType.UHidCreate),
            id: u16,
            vendorId: u16,
            productId: u16,
            name: string(u8),
            data: buffer(u16),
        },
        { littleEndian: false },
    ))();

export type UHidCreateControlMessage = StructInit<
    typeof UHidCreateControlMessage
>;

export function serializeUHidCreateControlMessage(
    message: ScrcpyUHidCreateControlMessage,
) {
    return UHidCreateControlMessage.serialize(message);
}
