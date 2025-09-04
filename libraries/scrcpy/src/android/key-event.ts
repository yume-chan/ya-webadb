import * as AndroidKeyCode from "./key-code-value.js";

export const AndroidKeyEventAction = {
    Down: 0,
    Up: 1,
} as const;

export type AndroidKeyEventAction =
    (typeof AndroidKeyEventAction)[keyof typeof AndroidKeyEventAction];

// https://cs.android.com/android/platform/superproject/+/master:frameworks/base/core/java/android/view/KeyEvent.java;l=993;drc=95c1165bb895dd844e1793460710f7163dd330a3
export const AndroidKeyEventMeta = {
    None: 0,
    Alt: 0x02,
    AltLeft: 0x10,
    AltRight: 0x20,
    Shift: 0x01,
    ShiftLeft: 0x40,
    ShiftRight: 0x80,
    Ctrl: 0x1000,
    CtrlLeft: 0x2000,
    CtrlRight: 0x4000,
    Meta: 0x10000,
    MetaLeft: 0x20000,
    MetaRight: 0x40000,
    CapsLock: 0x100000,
    NumLock: 0x200000,
    ScrollLock: 0x400000,
} as const;

export type AndroidKeyEventMeta =
    (typeof AndroidKeyEventMeta)[keyof typeof AndroidKeyEventMeta];

// enum
type AndroidKeyCode = (typeof AndroidKeyCode)[keyof typeof AndroidKeyCode];

export { AndroidKeyCode };

export const AndroidKeyNames = /* #__PURE__ */ (() =>
    Object.fromEntries(
        Object.entries(AndroidKeyCode).map(([k, v]) => [v, k]),
    ) as Record<AndroidKeyCode, string>)();
