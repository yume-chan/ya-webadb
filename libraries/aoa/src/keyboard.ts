// cspell:ignore Oper

// Most names follow Web API `KeyboardEvent.code`,
export enum HidKeyCode {
    KeyA = 4,
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
    Digit1,
    Digit2,
    Digit3,
    Digit4,
    Digit5,
    Digit6,
    Digit7,
    Digit8,
    Digit9,
    Digit0,
    Enter,
    Escape,
    Backspace,
    Tab,
    Space,
    Minus,
    Equal,
    BracketLeft,
    BracketRight,
    Backslash,
    NonUsHash,
    Semicolon,
    Quote,
    Backquote,
    Comma,
    Period,
    Slash,
    CapsLock,
    F1,
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
    PrintScreen,
    ScrollLock,
    Pause,
    Insert,
    Home,
    PageUp,
    Delete,
    End,
    PageDown,
    ArrowRight,
    ArrowLeft,
    ArrowDown,
    ArrowUp,
    NumLock,
    NumpadDivide,
    NumpadMultiply,
    NumpadSubtract,
    NumpadAdd,
    NumpadEnter,
    Numpad1,
    Numpad2,
    Numpad3,
    Numpad4,
    Numpad5,
    Numpad6,
    Numpad7,
    Numpad8,
    Numpad9,
    Numpad0,
    NumpadDecimal,
    NonUsBackslash,
    ContextMenu,
    Power,
    NumpadEqual,
    F13,
    F14,
    F15,
    F16,
    F17,
    F18,
    F19,
    F20,
    F21,
    F22,
    F23,
    F24,

    Execute,
    Help,
    Menu,
    Select,
    Stop,
    Again,
    Undo,
    Cut,
    Copy,
    Paste,
    Find,
    Mute,
    VolumeUp,
    VolumeDown,
    LockingCapsLock,
    LockingNumLock,
    LockingScrollLock,
    NumpadComma,
    KeypadEqualSign,
    International1,
    International2,
    International3,
    International4,
    International5,
    International6,
    International7,
    International8,
    International9,
    Lang1,
    Lang2,
    Lang3,
    Lang4,
    Lang5,
    Lang6,
    Lang7,
    Lang8,
    Lang9,
    AlternateErase,
    SysReq,
    Cancel,
    Clear,
    Prior,
    Return2,
    Separator,
    Out,
    Oper,
    ClearAgain,
    CrSel,
    ExSel,

    Keypad00 = 0xb0,
    Keypad000,
    ThousandsSeparator,
    DecimalSeparator,
    CurrencyUnit,
    CurrencySubUnit,
    KeypadLeftParen,
    KeypadRightParen,
    KeypadLeftBrace,
    KeypadRightBrace,
    KeypadTab,
    KeypadBackspace,
    KeypadA,
    KeypadB,
    KeypadC,
    KeypadD,
    KeypadE,
    KeypadF,
    KeypadXor,
    KeypadPower,
    KeypadPercent,
    KeypadLess,
    KeypadGreater,
    KeypadAmpersand,
    KeypadDblAmpersand,
    KeypadVerticalBar,
    KeypadDblVerticalBar,
    KeypadColon,
    KeypadHash,
    KeypadSpace,
    KeypadAt,
    KeypadExclamation,
    KeypadMemStore,
    KeypadMemRecall,
    KeypadMemClear,
    KeypadMemAdd,
    KeypadMemSubtract,
    KeypadMemMultiply,
    KeypadMemDivide,
    KeypadPlusMinus,
    KeypadClear,
    KeypadClearEntry,
    KeypadBinary,
    KeypadOctal,
    KeypadDecimal,
    KeypadHexadecimal,

    ControlLeft = 0xe0,
    ShiftLeft,
    AltLeft,
    MetaLeft,
    ControlRight,
    ShiftRight,
    AltRight,
    MetaRight,
}

export class HidKeyboard {
    /**
     * A HID Keyboard Report Descriptor.
     *
     * It's compatible with the legacy boot protocol. (1 byte modifier, 1 byte reserved, 6 bytes key codes).
     * Technically it doesn't need to be compatible with the legacy boot protocol, but it's the most common implementation.
     */
    public static readonly DESCRIPTOR = new Uint8Array(
        // prettier-ignore
        [
            0x05, 0x01, // Usage Page (Generic Desktop)
            0x09, 0x06, // Usage (Keyboard)
            0xa1, 0x01, // Collection (Application)
            0x05, 0x07, //    Usage Page (Keyboard)
            0x19, 0xe0, //    Usage Minimum (Keyboard Left Control)
            0x29, 0xe7, //    Usage Maximum (Keyboard Right GUI)
            0x15, 0x00, //    Logical Minimum (0)
            0x25, 0x01, //    Logical Maximum (1)
            0x75, 0x01, //    Report Size (1)
            0x95, 0x08, //    Report Count (8)
            0x81, 0x02, //    Input (Data, Variable, Absolute)

            0x75, 0x08, //    Report Size (8)
            0x95, 0x01, //    Report Count (1)
            0x81, 0x01, //    Input (Constant)

            0x05, 0x08, //    Usage Page (LEDs)
            0x19, 0x01, //    Usage Minimum (Num Lock)
            0x29, 0x05, //    Usage Maximum (Kana)
            0x75, 0x01, //    Report Size (1)
            0x95, 0x05, //    Report Count (5)
            0x91, 0x02, //    Output (Data, Variable, Absolute)

            0x75, 0x03, //    Report Size (3)
            0x95, 0x01, //    Report Count (1)
            0x91, 0x01, //    Output (Constant)

            0x05, 0x07, //    Usage Page (Keyboard)
            0x19, 0x00, //    Usage Minimum (Reserved (no event indicated))
            0x29, 0xdd, //    Usage Maximum (Keyboard Application)
            0x15, 0x00, //    Logical Minimum (0)
            0x25, 0xdd, //    Logical Maximum (221)
            0x75, 0x08, //    Report Size (8)
            0x95, 0x06, //    Report Count (6)
            0x81, 0x00, //    Input (Data, Array)
            0xc0        // End Collection
        ]
    );

    private _modifiers = 0;
    private _keys: Set<HidKeyCode> = new Set();

    public down(key: HidKeyCode) {
        if (key >= HidKeyCode.ControlLeft && key <= HidKeyCode.MetaRight) {
            this._modifiers |= 1 << (key - HidKeyCode.ControlLeft);
        } else {
            this._keys.add(key);
        }
    }

    public up(key: HidKeyCode) {
        if (key >= HidKeyCode.ControlLeft && key <= HidKeyCode.MetaRight) {
            this._modifiers &= ~(1 << (key - HidKeyCode.ControlLeft));
        } else {
            this._keys.delete(key);
        }
    }

    public reset() {
        this._modifiers = 0;
        this._keys.clear();
    }

    public serializeInputReport() {
        const buffer = new Uint8Array(8);
        buffer[0] = this._modifiers;
        let i = 2;
        for (const key of this._keys) {
            buffer[i] = key;
            i += 1;
            if (i >= 8) {
                break;
            }
        }
        return buffer;
    }
}
