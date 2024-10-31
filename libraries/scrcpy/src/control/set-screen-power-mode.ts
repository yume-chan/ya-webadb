import type { StructInit } from "@yume-chan/struct";
import { Struct, u8 } from "@yume-chan/struct";

// https://cs.android.com/android/platform/superproject/+/master:frameworks/base/core/java/android/view/SurfaceControl.java;l=659;drc=20303e05bf73796124ab70a279cf849b61b97905
export const AndroidScreenPowerMode = {
    Off: 0,
    Normal: 2,
} as const;

export type AndroidScreenPowerMode =
    (typeof AndroidScreenPowerMode)[keyof typeof AndroidScreenPowerMode];

export const ScrcpySetScreenPowerModeControlMessage = new Struct(
    { type: u8, mode: u8.as<AndroidScreenPowerMode>() },
    { littleEndian: false },
);

export type ScrcpySetScreenPowerModeControlMessage = StructInit<
    typeof ScrcpySetScreenPowerModeControlMessage
>;
