import type { StructInit } from "@yume-chan/struct";
import { string, struct, u32, u8 } from "@yume-chan/struct";

import type { ScrcpySetClipboardControlMessage } from "../../latest.js";

export const SetClipboardControlMessage = struct(
    { type: u8, content: string(u32) },
    { littleEndian: false },
);

export type SetClipboardControlMessage = StructInit<
    typeof SetClipboardControlMessage
>;

export function serializeSetClipboardControlMessage(
    message: ScrcpySetClipboardControlMessage,
): Uint8Array {
    return SetClipboardControlMessage.serialize(message);
}
