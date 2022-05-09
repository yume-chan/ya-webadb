import Struct, { placeholder } from '@yume-chan/struct';

// https://github.com/Genymobile/scrcpy/blob/fa5b2a29e983a46b49531def9cf3d80c40c3de37/app/src/control_msg.h#L23
// For their message bodies, see https://github.com/Genymobile/scrcpy/blob/5c62f3419d252d10cd8c9cbb7c918b358b81f2d0/app/src/control_msg.c#L92
export enum ScrcpyControlMessageType {
    InjectKeycode,
    InjectText,
    InjectTouch,
    InjectScroll,
    BackOrScreenOn,
    ExpandNotificationPanel,
    ExpandSettingPanel,
    CollapseNotificationPanel,
    GetClipboard,
    SetClipboard,
    SetScreenPowerMode,
    RotateDevice,
}

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

export const ScrcpySimpleControlMessage =
    new Struct()
        .uint8('type');

export const ScrcpyInjectTouchControlMessage =
    new Struct()
        .fields(ScrcpySimpleControlMessage)
        .uint8('action', placeholder<AndroidMotionEventAction>())
        .uint64('pointerId')
        .uint32('pointerX')
        .uint32('pointerY')
        .uint16('screenWidth')
        .uint16('screenHeight')
        .uint16('pressure')
        .uint32('buttons');

export type ScrcpyInjectTouchControlMessage = typeof ScrcpyInjectTouchControlMessage['TInit'];

export const ScrcpyInjectTextControlMessage =
    new Struct()
        .fields(ScrcpySimpleControlMessage)
        .uint32('length')
        .string('text', { lengthField: 'length' });

export type ScrcpyInjectTextControlMessage =
    typeof ScrcpyInjectTextControlMessage['TInit'];

export enum AndroidKeyEventAction {
    Down = 0,
    Up = 1,
}

export enum AndroidKeyCode {
    Home = 3,
    Back = 4,
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
    Space = 62,
    Enter = 66,
    Delete = 67,
    AppSwitch = 187,
}

export const ScrcpyInjectKeyCodeControlMessage =
    new Struct()
        .fields(ScrcpySimpleControlMessage)
        .uint8('action', placeholder<AndroidKeyEventAction>())
        .uint32('keyCode')
        .uint32('repeat')
        .uint32('metaState');

export type ScrcpyInjectKeyCodeControlMessage =
    typeof ScrcpyInjectKeyCodeControlMessage['TInit'];
