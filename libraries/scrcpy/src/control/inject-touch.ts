import type { ScrcpyInjectTouchControlMessage2_0 } from "../index.js";

// https://developer.android.com/reference/android/view/MotionEvent#constants_1
export enum AndroidMotionEventAction {
    Down,
    Up,
    Move,
    Cancel,
    Outside,
    PointerDown,
    PointerUp,
    HoverMove,
    Scroll,
    HoverEnter,
    HoverExit,
    ButtonPress,
    ButtonRelease,
}

export enum AndroidMotionEventButton {
    Primary = 0x01,
    Secondary = 0x02,
    Tertiary = 0x04,
    Back = 0x08,
    Forward = 0x10,
    StylusPrimary = 0x20,
    StylusSecondary = 0x40,
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ScrcpyPointerId {
    export const Mouse = BigInt(-1);
    export const Finger = BigInt(-2);
    export const VirtualMouse = BigInt(-3);
    export const VirtualFinger = BigInt(-4);
}

export type ScrcpyInjectTouchControlMessage =
    ScrcpyInjectTouchControlMessage2_0;
