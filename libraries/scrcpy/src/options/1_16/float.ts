import { getUint16, setUint16 } from "@yume-chan/no-data-view";
import type { Field } from "@yume-chan/struct";
import { bipedal } from "@yume-chan/struct";

export function clamp(value: number, min: number, max: number): number {
    if (value < min) {
        return min;
    }

    if (value > max) {
        return max;
    }

    return value;
}

export const ScrcpyUnsignedFloat: Field<number, never, never> = {
    size: 2,
    serialize(value, { buffer, index, littleEndian }) {
        // https://github.com/Genymobile/scrcpy/blob/1f138aef41de651668043b32c4effc2d4adbfc44/app/src/util/binary.h#L51
        value = clamp(value, -1, 1);
        value = value === 1 ? 0xffff : value * 0x10000;
        setUint16(buffer, index, value, littleEndian);
    },
    deserialize: bipedal(function* (then, { reader, littleEndian }) {
        const data = yield* then(reader.readExactly(2));
        const value = getUint16(data, 0, littleEndian);
        // https://github.com/Genymobile/scrcpy/blob/1f138aef41de651668043b32c4effc2d4adbfc44/server/src/main/java/com/genymobile/scrcpy/Binary.java#L22
        return value === 0xffff ? 1 : value / 0x10000;
    }),
};
