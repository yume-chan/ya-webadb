import Struct, { placeholder } from "@yume-chan/struct";

export enum AndroidKeyEventAction {
    Down = 0,
    Up = 1,
}

// https://cs.android.com/android/platform/superproject/+/master:frameworks/base/core/java/android/view/KeyEvent.java;l=993;drc=95c1165bb895dd844e1793460710f7163dd330a3
export enum AndroidKeyEventMeta {
    Alt = 0x02,
    AltLeft = 0x10,
    AltRight = 0x20,
    Shift = 0x01,
    ShiftLeft = 0x40,
    ShiftRight = 0x80,
    Ctrl = 0x1000,
    CtrlLeft = 0x2000,
    CtrlRight = 0x4000,
    Meta = 0x10000,
    MetaLeft = 0x20000,
    MetaRight = 0x40000,
    CapsLock = 0x100000,
    NumLock = 0x200000,
    ScrollLock = 0x400000,
}

// https://cs.android.com/android/platform/superproject/+/master:frameworks/base/core/java/android/view/KeyEvent.java;l=97;drc=95c1165bb895dd844e1793460710f7163dd330a3
// Most names follow Web API `KeyboardEvent.code`,
// Android-only (not exist in HID keyboard standard) keys are prefixed by `Android`.
export enum AndroidKeyCode {
    AndroidHome = 3,
    AndroidBack = 4,
    AndroidCall,
    AndroidEndCall,

    Digit0,
    Digit1,
    Digit2,
    Digit3,
    Digit4,
    Digit5,
    Digit6,
    Digit7,
    Digit8,
    Digit9,
    /**
     * '*' key.
     */
    Star, // Name not verified
    /**
     * '#' key.
     */
    Pound, // Name not verified

    /**
     * Directional Pad Up key.
     */
    ArrowUp,
    /**
     * Directional Pad Down key.
     */
    ArrowDown,
    /**
     * Directional Pad Left key.
     */
    ArrowLeft,
    /**
     * Directional Pad Right key.
     */
    ArrowRight,
    /**
     * Directional Pad Center key.
     */
    AndroidDPadCenter,

    VolumeUp, // Name not verified
    VolumeDown, // Name not verified
    Power, // Name not verified
    AndroidCamera,
    Clear, // Name not verified

    KeyA,
    KeyB,
    KeyC,
    KeyD,
    KeyE,
    KeyF,
    KeyG,
    KeyH,
    KeyI,
    KeyJ,
    KeyK,
    KeyL,
    KeyM,
    KeyN,
    KeyO,
    KeyP,
    KeyQ,
    KeyR,
    KeyS,
    KeyT,
    KeyU,
    KeyV,
    KeyW,
    KeyX,
    KeyY,
    KeyZ,
    Comma,
    Period,
    AltLeft,
    AltRight,
    ShiftLeft,
    ShiftRight,
    Tab,
    Space,
    AndroidSymbol,
    AndroidExplorer,
    AndroidEnvelope,
    Enter,
    Backspace,
    Backquote,
    Minus,
    Equal,
    BracketLeft,
    BracketRight,
    Backslash,
    Semicolon,
    Quote,
    Slash,
    At, // Name not verified

    AndroidNum,
    AndroidHeadsetHook,
    /**
     * Camera Focus key。
     */
    AndroidFocus,

    Plus, // Name not verified
    ContextMenu,
    AndroidNotification,
    AndroidSearch,

    PageUp = 92,
    PageDown,

    Escape = 111,
    Delete,
    ControlLeft,
    ControlRight,
    CapsLock,
    ScrollLock,
    MetaLeft,
    MetaRight,
    AndroidFunction,
    PrintScreen,
    Pause,

    Home,
    End,
    Insert,
    AndroidForward,

    F1 = 131,
    F2,
    F3,
    F4,
    F5,
    F6,
    F7,
    F8,
    F9,
    F10,
    F11,
    F12,

    NumLock,
    Numpad0,
    Numpad1,
    Numpad2,
    Numpad3,
    Numpad4,
    Numpad5,
    Numpad6,
    Numpad7,
    Numpad8,
    Numpad9,
    NumpadDivide,
    NumpadMultiply,
    NumpadSubtract,
    NumpadAdd,
    NumpadDecimal,
    NumpadComma, // Name not verified
    NumpadEnter,
    NumpadEquals, // Name not verified
    NumpadLeftParen, // Name not verified
    NumpadRightParen, // Name not verified

    VolumeMute = 164, // Name not verified
    AndroidAppSwitch = 187,

    AndroidCut = 277,
    AndroidCopy,
    AndroidPaste,
}

export const ScrcpyInjectKeyCodeControlMessage = new Struct()
    .uint8("type")
    .uint8("action", placeholder<AndroidKeyEventAction>())
    .uint32("keyCode", placeholder<AndroidKeyCode>())
    .uint32("repeat")
    .uint32("metaState", placeholder<AndroidKeyEventMeta>());

export type ScrcpyInjectKeyCodeControlMessage =
    (typeof ScrcpyInjectKeyCodeControlMessage)["TInit"];
