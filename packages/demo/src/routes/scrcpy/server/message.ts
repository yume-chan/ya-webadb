import { Struct, placeholder, StructInitType } from '@yume-chan/struct';

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
        .uint8('type', undefined, placeholder<ScrcpyControlMessageType.BackOrScreenOn>());

export type ScrcpySimpleControlMessage = StructInitType<typeof ScrcpySimpleControlMessage>;

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
        .uint8('type', undefined, ScrcpyControlMessageType.InjectTouch as const)
        .uint8('action', undefined, placeholder<AndroidMotionEventAction>())
        .uint64('pointerId')
        .uint32('pointerX')
        .uint32('pointerY')
        .uint16('screenWidth')
        .uint16('screenHeight')
        .uint16('pressure')
        .uint32('buttons');

export type ScrcpyInjectTouchControlMessage = StructInitType<typeof ScrcpyInjectTouchControlMessage>;

export enum AndroidKeyEventAction {
    Down = 1,
    Up = 1 << 1,
}

export enum AndroidKeyEventKeyCode {
    Home = 3,
    Back = 4,
    AppSwitch = 187,
}

export const ScrcpyInjectKeyCodeControlMessage =
    new Struct()
        .uint8('type', undefined, ScrcpyControlMessageType.InjectKeycode as const)
        .uint8('action', undefined, placeholder<AndroidKeyEventAction>())
        .uint32('keyCode')
        .uint32('repeat')
        .uint32('metaState');

export type ScrcpyInjectKeyCodeControlMessage =
    StructInitType<typeof ScrcpyInjectKeyCodeControlMessage>;

export type ScrcpyControlMessage =
    ScrcpySimpleControlMessage |
    ScrcpyInjectTouchControlMessage |
    ScrcpyInjectKeyCodeControlMessage;
