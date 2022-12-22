import Struct, { placeholder } from "@yume-chan/struct";

import { ScrcpyControlMessageType } from "./type.js";

export enum AndroidKeyEventAction {
    Down = 0,
    Up = 1,
}

// https://github.com/Genymobile/scrcpy/blob/cabb102a04153f9c237b18257d3269a058558c63/app/src/android/keycodes.h#L26
export enum AndroidKeyCode {
    Home = 3,
    Back = 4,

    DPadUp = 19,
    DPadDown,
    DPadLeft,
    DPadRight,

    VolumeUp = 24,
    VolumeDown,

    A = 29,
    B,
    C,
    D,
    E,
    F,
    G,
    H,
    I,
    J,
    K,
    L,
    M,
    N,
    O,
    P,
    Q,
    R,
    S,
    T,
    U,
    V,
    W,
    X,
    Y,
    Z,

    Tab = 61,
    Space,
    Enter = 66,
    Delete,
    Escape = 111,
    ForwardDelete,

    MoveHome = 122,
    MoveEnd = 123,

    VolumeMute = 164,
    AppSwitch = 187,
}

export const ScrcpyInjectKeyCodeControlMessage = new Struct()
    .uint8("type", ScrcpyControlMessageType.InjectKeyCode as const)
    .uint8("action", placeholder<AndroidKeyEventAction>())
    .uint32("keyCode")
    .uint32("repeat")
    .uint32("metaState");

export type ScrcpyInjectKeyCodeControlMessage =
    typeof ScrcpyInjectKeyCodeControlMessage["TInit"];
