import Struct, { placeholder } from '@yume-chan/struct';

export enum ScrcpyControlMessageType {
    InjectKeycode,
    InjectText,
    InjectTouch,
    InjectScroll,
    BackOrScreenOn,
    ExpandNotificationPanel,
    CollapseNotificationPanel,
    GetClipboard,
    SetClipboard,
    SetScreenPowerMode,
    RotateDevice,
}

export const ScrcpySimpleControlMessage =
    new Struct()
        .uint8('type', placeholder<ScrcpyControlMessageType.BackOrScreenOn>());

export type ScrcpySimpleControlMessage = typeof ScrcpySimpleControlMessage['TInit'];

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

export const ScrcpyInjectTouchControlMessage =
    new Struct()
        .uint8('type', ScrcpyControlMessageType.InjectTouch as const)
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
        .uint8('type', ScrcpyControlMessageType.InjectText as const)
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
    Delete = 67,
    AppSwitch = 187,
}

export const ScrcpyInjectKeyCodeControlMessage =
    new Struct()
        .uint8('type', ScrcpyControlMessageType.InjectKeycode as const)
        .uint8('action', placeholder<AndroidKeyEventAction>())
        .uint32('keyCode')
        .uint32('repeat')
        .uint32('metaState');

export type ScrcpyInjectKeyCodeControlMessage =
    typeof ScrcpyInjectKeyCodeControlMessage['TInit'];

export type ScrcpyControlMessage =
    ScrcpySimpleControlMessage |
    ScrcpyInjectTouchControlMessage |
    ScrcpyInjectKeyCodeControlMessage;
