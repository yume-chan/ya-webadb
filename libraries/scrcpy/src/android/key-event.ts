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

// https://cs.android.com/android/platform/superproject/+/master:frameworks/base/core/java/android/view/KeyEvent.java;l=97;drc=95c1165bb895dd844e1793460710f7163dd330a3
// Android key code to Chrome key code: https://source.chromium.org/chromium/chromium/src/+/main:ui/events/keycodes/keyboard_code_conversion_android.cc
// Chrome key code to DOM key code: https://source.chromium.org/chromium/chromium/src/+/main:ui/events/keycodes/dom/dom_code_data.inc
// Some keys are not mapped to `KeyboardEvent.code`, only to `KeyboardEvent.key`: https://source.chromium.org/chromium/chromium/src/+/main:ui/events/keycodes/dom/dom_key_data.inc
export const AndroidKeyCode = {
    AndroidHome: 3,
    AndroidBack: 4,
    AndroidCall: 5,
    AndroidEndCall: 6,

    Digit0: 7,
    Digit1: 8,
    Digit2: 9,
    Digit3: 10,
    Digit4: 11,
    Digit5: 12,
    Digit6: 13,
    Digit7: 14,
    Digit8: 15,
    Digit9: 16,
    /**
     * '*' key.
     */
    Star: 17, // Name not verified
    /**
     * '#' key.
     */
    Pound: 18, // Name not verified

    /**
     * Directional Pad Up key.
     */
    ArrowUp: 19,
    /**
     * Directional Pad Down key.
     */
    ArrowDown: 20,
    /**
     * Directional Pad Left key.
     */
    ArrowLeft: 21,
    /**
     * Directional Pad Right key.
     */
    ArrowRight: 22,
    /**
     * Directional Pad Center key.
     */
    AndroidDPadCenter: 23,

    VolumeUp: 24, // Name not verified
    VolumeDown: 25, // Name not verified
    Power: 26, // Name not verified
    AndroidCamera: 27,
    Clear: 28, // Name not verified

    KeyA: 29,
    KeyB: 30,
    KeyC: 31,
    KeyD: 32,
    KeyE: 33,
    KeyF: 34,
    KeyG: 35,
    KeyH: 36,
    KeyI: 37,
    KeyJ: 38,
    KeyK: 39,
    KeyL: 40,
    KeyM: 41,
    KeyN: 42,
    KeyO: 43,
    KeyP: 44,
    KeyQ: 45,
    KeyR: 46,
    KeyS: 47,
    KeyT: 48,
    KeyU: 49,
    KeyV: 50,
    KeyW: 51,
    KeyX: 52,
    KeyY: 53,
    KeyZ: 54,
    Comma: 55,
    Period: 56,
    AltLeft: 57,
    AltRight: 58,
    ShiftLeft: 59,
    ShiftRight: 60,
    Tab: 61,
    Space: 62,
    AndroidSymbol: 63,
    AndroidExplorer: 64,
    AndroidEnvelope: 65,
    Enter: 66,
    Backspace: 67,
    Backquote: 68,
    Minus: 69,
    Equal: 70,
    BracketLeft: 71,
    BracketRight: 72,
    Backslash: 73,
    Semicolon: 74,
    Quote: 75,
    Slash: 76,
    At: 77, // Name not verified

    AndroidNum: 78,
    AndroidHeadsetHook: 79,
    /**
     * Camera Focus key。
     */
    AndroidFocus: 80,

    Plus: 81, // Name not verified
    ContextMenu: 82,
    AndroidNotification: 83,
    AndroidSearch: 84,

    PageUp: 92,
    PageDown: 93,

    Escape: 111,
    Delete: 112,
    ControlLeft: 113,
    ControlRight: 114,
    CapsLock: 115,
    ScrollLock: 116,
    MetaLeft: 117,
    MetaRight: 118,
    AndroidFunction: 119,
    PrintScreen: 120,
    Pause: 121,

    Home: 122,
    End: 123,
    Insert: 124,
    AndroidForward: 125,

    F1: 131,
    F2: 132,
    F3: 133,
    F4: 134,
    F5: 135,
    F6: 136,
    F7: 137,
    F8: 138,
    F9: 139,
    F10: 140,
    F11: 141,
    F12: 142,

    NumLock: 143,
    Numpad0: 144,
    Numpad1: 145,
    Numpad2: 146,
    Numpad3: 147,
    Numpad4: 148,
    Numpad5: 149,
    Numpad6: 150,
    Numpad7: 151,
    Numpad8: 152,
    Numpad9: 153,
    NumpadDivide: 154,
    NumpadMultiply: 155,
    NumpadSubtract: 156,
    NumpadAdd: 157,
    NumpadDecimal: 158,
    NumpadComma: 159, // Name not verified
    NumpadEnter: 160,
    NumpadEquals: 161, // Name not verified
    NumpadLeftParen: 162, // Name not verified
    NumpadRightParen: 163, // Name not verified

    VolumeMute: 164, // Name not verified
    AndroidAppSwitch: 187, // Name not verified

    AndroidCut: 277,
    AndroidCopy: 278,
    AndroidPaste: 279,
} as const;

export type AndroidKeyCode =
    (typeof AndroidKeyCode)[keyof typeof AndroidKeyCode];

export const AndroidKeyNames = /* #__PURE__ */ (() =>
    Object.fromEntries(
        Object.entries(AndroidKeyCode).map(([k, v]) => [v, k]),
    ) as Record<AndroidKeyCode, string>)();
