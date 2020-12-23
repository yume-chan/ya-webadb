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

export type ScrcpyControlMessage =
    ScrcpySimpleControlMessage |
    ScrcpyInjectTouchControlMessage;
