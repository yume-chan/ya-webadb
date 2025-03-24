import { getUint16, setUint16 } from "@yume-chan/no-data-view";
import type { Field, StructInit } from "@yume-chan/struct";
import { field, struct, u16, u32, u64, u8 } from "@yume-chan/struct";

import type { AndroidMotionEventAction } from "../../android/index.js";
import type { ScrcpyInjectTouchControlMessage } from "../../latest.js";
import { clamp } from "../../utils/index.js";

export const UnsignedFloat: Field<number, never, never> = field(
    2,
    "byob",
    (source, { buffer, index, littleEndian }) => {
        // https://github.com/Genymobile/scrcpy/blob/1f138aef41de651668043b32c4effc2d4adbfc44/app/src/util/binary.h#L51
        source = clamp(source, -1, 1);
        source = source === 1 ? 0xffff : source * 0x10000;
        setUint16(buffer, index, source, littleEndian);
    },
    function* (then, reader, { littleEndian }) {
        const data = yield* then(reader.readExactly(2));
        const value = getUint16(data, 0, littleEndian);
        // https://github.com/Genymobile/scrcpy/blob/1f138aef41de651668043b32c4effc2d4adbfc44/server/src/main/java/com/genymobile/scrcpy/Binary.java#L22
        return value === 0xffff ? 1 : value / 0x10000;
    },
);

export const PointerId = {
    Mouse: -1n,
    Finger: -2n,
    VirtualMouse: -3n,
    VirtualFinger: -4n,
} as const;

export const InjectTouchControlMessage = struct(
    {
        type: u8,
        action: u8<AndroidMotionEventAction>(),
        pointerId: u64,
        pointerX: u32,
        pointerY: u32,
        videoWidth: u16,
        videoHeight: u16,
        pressure: UnsignedFloat,
        buttons: u32,
    },
    { littleEndian: false },
);

export type InjectTouchControlMessage = StructInit<
    typeof InjectTouchControlMessage
>;

export function serializeInjectTouchControlMessage(
    message: ScrcpyInjectTouchControlMessage,
): Uint8Array {
    return InjectTouchControlMessage.serialize(message);
}
