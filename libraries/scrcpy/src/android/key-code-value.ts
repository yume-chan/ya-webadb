// https://cs.android.com/android/platform/superproject/+/master:frameworks/base/core/java/android/view/KeyEvent.java;l=97;drc=95c1165bb895dd844e1793460710f7163dd330a3
// Android key code to Chrome key code: https://source.chromium.org/chromium/chromium/src/+/main:ui/events/keycodes/keyboard_code_conversion_android.cc
// Chrome key code to DOM key code: https://source.chromium.org/chromium/chromium/src/+/main:ui/events/keycodes/dom/dom_code_data.inc
// Some keys are not mapped to `KeyboardEvent.code`, only to `KeyboardEvent.key`: https://source.chromium.org/chromium/chromium/src/+/main:ui/events/keycodes/dom/dom_key_data.inc

export const AndroidHome = 3;
export const AndroidBack = 4;
export const AndroidCall = 5;
export const AndroidEndCall = 6;

export const Digit0 = 7;
export const Digit1 = 8;
export const Digit2 = 9;
export const Digit3 = 10;
export const Digit4 = 11;
export const Digit5 = 12;
export const Digit6 = 13;
export const Digit7 = 14;
export const Digit8 = 15;
export const Digit9 = 16;

/**
 * '*' key.
 */
export const Star = 17; // Name not verified
/**
 * '#' key.
 */
export const Pound = 18; // Name not verified

/**
 * Directional Pad Up key.
 */
export const ArrowUp = 19;
/**
 * Directional Pad Down key.
 */
export const ArrowDown = 20;
/**
 * Directional Pad Left key.
 */
export const ArrowLeft = 21;
/**
 * Directional Pad Right key.
 */
export const ArrowRight = 22;
/**
 * Directional Pad Center key.
 */
export const AndroidDPadCenter = 23;

export const VolumeUp = 24; // Name not verified
export const VolumeDown = 25; // Name not verified
export const Power = 26; // Name not verified
export const AndroidCamera = 27;
export const Clear = 28; // Name not verified

export const KeyA = 29;
export const KeyB = 30;
export const KeyC = 31;
export const KeyD = 32;
export const KeyE = 33;
export const KeyF = 34;
export const KeyG = 35;
export const KeyH = 36;
export const KeyI = 37;
export const KeyJ = 38;
export const KeyK = 39;
export const KeyL = 40;
export const KeyM = 41;
export const KeyN = 42;
export const KeyO = 43;
export const KeyP = 44;
export const KeyQ = 45;
export const KeyR = 46;
export const KeyS = 47;
export const KeyT = 48;
export const KeyU = 49;
export const KeyV = 50;
export const KeyW = 51;
export const KeyX = 52;
export const KeyY = 53;
export const KeyZ = 54;
export const Comma = 55;
export const Period = 56;
export const AltLeft = 57;
export const AltRight = 58;
export const ShiftLeft = 59;
export const ShiftRight = 60;
export const Tab = 61;
export const Space = 62;
export const AndroidSymbol = 63;
export const AndroidExplorer = 64;
export const AndroidEnvelope = 65;
export const Enter = 66;
export const Backspace = 67;
export const Backquote = 68;
export const Minus = 69;
export const Equal = 70;
export const BracketLeft = 71;
export const BracketRight = 72;
export const Backslash = 73;
export const Semicolon = 74;
export const Quote = 75;
export const Slash = 76;
export const At = 77; // Name not verified

/**
 * Number modifier key.
 *
 * Used to enter numeric symbols.
 * This key is not Num Lock; it is more like {@link AltLeft} and is
 * interpreted as an ALT key by `android.text.method.MetaKeyKeyListener`.
 */
export const AndroidNum = 78;
/**
 * Headset Hook key.
 *
 * Used to hang up calls and stop media.
 */
export const AndroidHeadsetHook = 79;
/**
 * Camera Focus key.
 *
 * Used to focus the camera.
 */
export const AndroidFocus = 80;

export const Plus = 81; // Name not verified
export const ContextMenu = 82;
export const AndroidNotification = 83;
export const AndroidSearch = 84;

export const PageUp = 92;
export const PageDown = 93;

export const Escape = 111;
export const Delete = 112;
export const ControlLeft = 113;
export const ControlRight = 114;
export const CapsLock = 115;
export const ScrollLock = 116;
export const MetaLeft = 117;
export const MetaRight = 118;
export const AndroidFunction = 119;
export const PrintScreen = 120;
export const Pause = 121;

export const Home = 122;
export const End = 123;
export const Insert = 124;
export const AndroidForward = 125;

export const F1 = 131;
export const F2 = 132;
export const F3 = 133;
export const F4 = 134;
export const F5 = 135;
export const F6 = 136;
export const F7 = 137;
export const F8 = 138;
export const F9 = 139;
export const F10 = 140;
export const F11 = 141;
export const F12 = 142;

export const NumLock = 143;
export const Numpad0 = 144;
export const Numpad1 = 145;
export const Numpad2 = 146;
export const Numpad3 = 147;
export const Numpad4 = 148;
export const Numpad5 = 149;
export const Numpad6 = 150;
export const Numpad7 = 151;
export const Numpad8 = 152;
export const Numpad9 = 153;
export const NumpadDivide = 154;
export const NumpadMultiply = 155;
export const NumpadSubtract = 156;
export const NumpadAdd = 157;
export const NumpadDecimal = 158;
export const NumpadComma = 159; // Name not verified
export const NumpadEnter = 160;
export const NumpadEquals = 161; // Name not verified
export const NumpadLeftParen = 162; // Name not verified
export const NumpadRightParen = 163; // Name not verified

export const VolumeMute = 164; // Name not verified
export const AndroidAppSwitch = 187; // Name not verified

export const AndroidCut = 277;
export const AndroidCopy = 278;
export const AndroidPaste = 279;
