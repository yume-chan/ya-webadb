import type { StructInit } from "@yume-chan/struct";
import { struct, u8 } from "@yume-chan/struct";

import type { AndroidScreenPowerMode } from "../android/index.js";

export const ScrcpySetDisplayPowerControlMessage = struct(
    { type: u8, mode: u8<AndroidScreenPowerMode>() },
    { littleEndian: false },
);

export type ScrcpySetScreenPowerModeControlMessage = StructInit<
    typeof ScrcpySetDisplayPowerControlMessage
>;
