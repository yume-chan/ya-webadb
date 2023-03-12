import Struct from "@yume-chan/struct";

import { ScrcpyDeviceMessageType } from "./type.js";

export const ScrcpyAckClipboardDeviceMessage = new Struct()
    .uint64("sequence")
    .extra({ type: ScrcpyDeviceMessageType.AckClipboard as const });

export type ScrcpyAckClipboardDeviceMessage =
    (typeof ScrcpyAckClipboardDeviceMessage)["TDeserializeResult"];
