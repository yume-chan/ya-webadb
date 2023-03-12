import Struct, { placeholder } from "@yume-chan/struct";

// https://cs.android.com/android/platform/superproject/+/master:frameworks/base/core/java/android/view/SurfaceControl.java;l=659;drc=20303e05bf73796124ab70a279cf849b61b97905
export enum AndroidScreenPowerMode {
    Off = 0,
    Normal = 2,
}

export const ScrcpySetScreenPowerModeControlMessage = new Struct()
    .uint8("type")
    .uint8("mode", placeholder<AndroidScreenPowerMode>());

export type ScrcpySetScreenPowerModeControlMessage =
    (typeof ScrcpySetScreenPowerModeControlMessage)["TInit"];
