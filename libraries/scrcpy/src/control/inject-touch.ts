import Struct, {
    NumberFieldDefinition,
    NumberFieldType,
    placeholder,
} from "@yume-chan/struct";

import { ScrcpyControlMessageType } from "./type.js";

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

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ScrcpyPointerId {
    export const Mouse = BigInt(-1);
    export const Finger = BigInt(-2);
    export const VirtualMouse = BigInt(-3);
    export const VirtualFinger = BigInt(-4);
}

export function clamp(value: number, min: number, max: number): number {
    if (value < min) {
        return min;
    }

    if (value > max) {
        return max;
    }

    return value;
}

export const ScrcpyFloatToUint16NumberType: NumberFieldType = {
    size: 2,
    signed: false,
    deserialize(array, littleEndian) {
        const value = NumberFieldType.Uint16.deserialize(array, littleEndian);
        // https://github.com/Genymobile/scrcpy/blob/1f138aef41de651668043b32c4effc2d4adbfc44/server/src/main/java/com/genymobile/scrcpy/Binary.java#L22
        return value === 0xffff ? 1 : value / 0x10000;
    },
    serialize(dataView, offset, value, littleEndian) {
        // https://github.com/Genymobile/scrcpy/blob/1f138aef41de651668043b32c4effc2d4adbfc44/app/src/util/binary.h#L51
        value = clamp(value, -1, 1);
        value = value === 1 ? 0xffff : value * 0x10000;
        NumberFieldType.Uint16.serialize(dataView, offset, value, littleEndian);
    },
};

const ScrcpyFloatToUint16FieldDefinition = new NumberFieldDefinition(
    ScrcpyFloatToUint16NumberType
);

export const ScrcpyInjectTouchControlMessage = new Struct()
    .uint8("type", ScrcpyControlMessageType.InjectTouch as const)
    .uint8("action", placeholder<AndroidMotionEventAction>())
    .uint64("pointerId")
    .uint32("pointerX")
    .uint32("pointerY")
    .uint16("screenWidth")
    .uint16("screenHeight")
    .field("pressure", ScrcpyFloatToUint16FieldDefinition)
    .uint32("buttons");

export type ScrcpyInjectTouchControlMessage =
    (typeof ScrcpyInjectTouchControlMessage)["TInit"];
