import Struct from "@yume-chan/struct";

import { ScrcpyControlMessageType } from "./type.js";

export const ScrcpyRotateDeviceControlMessage = new Struct().uint8(
    "type",
    ScrcpyControlMessageType.RotateDevice as const
);

export type ScrcpyRotateDeviceControlMessage =
    (typeof ScrcpyRotateDeviceControlMessage)["TInit"];
