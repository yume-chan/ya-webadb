import Struct from "@yume-chan/struct";

import { ScrcpyDeviceMessageType } from "./type.js";

export const ScrcpyClipboardDeviceMessage = new Struct()
    .uint32("length")
    .string("content", { lengthField: "length" })
    .extra({ type: ScrcpyDeviceMessageType.Clipboard as const });

export type ScrcpyClipboardDeviceMessage =
    (typeof ScrcpyClipboardDeviceMessage)["TDeserializeResult"];
