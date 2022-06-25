import Struct, { placeholder } from '@yume-chan/struct';
import { ScrcpyControlMessageType } from './type.js';

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

export type ScrcpyInjectTouchControlMessage =
    typeof ScrcpyInjectTouchControlMessage['TInit'];
