import { getUint16 } from "@yume-chan/no-data-view";
import type { NumberFieldVariant } from "@yume-chan/struct";
import { NumberFieldDefinition } from "@yume-chan/struct";

export function clamp(value: number, min: number, max: number): number {
    if (value < min) {
        return min;
    }

    if (value > max) {
        return max;
    }

    return value;
}

export const ScrcpyUnsignedFloatNumberVariant: NumberFieldVariant = {
    size: 2,
    signed: false,
    deserialize(array, littleEndian) {
        const value = getUint16(array, 0, littleEndian);
        // https://github.com/Genymobile/scrcpy/blob/1f138aef41de651668043b32c4effc2d4adbfc44/server/src/main/java/com/genymobile/scrcpy/Binary.java#L22
        return value === 0xffff ? 1 : value / 0x10000;
    },
    serialize(dataView, offset, value, littleEndian) {
        // https://github.com/Genymobile/scrcpy/blob/1f138aef41de651668043b32c4effc2d4adbfc44/app/src/util/binary.h#L51
        value = clamp(value, -1, 1);
        value = value === 1 ? 0xffff : value * 0x10000;
        dataView.setUint16(offset, value, littleEndian);
    },
};

export const ScrcpyUnsignedFloatFieldDefinition = new NumberFieldDefinition(
    ScrcpyUnsignedFloatNumberVariant,
);
