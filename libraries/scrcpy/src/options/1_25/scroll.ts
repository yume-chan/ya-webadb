import { getInt16, setInt16 } from "@yume-chan/no-data-view";
import type { Field, StructInit } from "@yume-chan/struct";
import { bipedal, struct, u16, u32, u8 } from "@yume-chan/struct";

import type { ScrcpyInjectScrollControlMessage } from "../../control/index.js";
import type { ScrcpyScrollController } from "../1_16/index.js";
import { clamp } from "../1_16/index.js";

export const ScrcpySignedFloat: Field<number, never, never> = {
    size: 2,
    serialize(value, { buffer, index, littleEndian }) {
        // https://github.com/Genymobile/scrcpy/blob/1f138aef41de651668043b32c4effc2d4adbfc44/app/src/util/binary.h#L51
        value = clamp(value, -1, 1);
        value = value === 1 ? 0x7fff : value * 0x8000;
        setInt16(buffer, index, value, littleEndian);
    },
    deserialize: bipedal(function* (then, { reader, littleEndian }) {
        const data = yield* then(reader.readExactly(2));
        const value = getInt16(data, 0, littleEndian);
        // https://github.com/Genymobile/scrcpy/blob/1f138aef41de651668043b32c4effc2d4adbfc44/server/src/main/java/com/genymobile/scrcpy/Binary.java#L34
        return value === 0x7fff ? 1 : value / 0x8000;
    }),
};

export const ScrcpyInjectScrollControlMessage1_25 = struct(
    {
        type: u8,
        pointerX: u32,
        pointerY: u32,
        screenWidth: u16,
        screenHeight: u16,
        scrollX: ScrcpySignedFloat,
        scrollY: ScrcpySignedFloat,
        buttons: u32,
    },
    { littleEndian: false },
);

export type ScrcpyInjectScrollControlMessage1_25 = StructInit<
    typeof ScrcpyInjectScrollControlMessage1_25
>;

export class ScrcpyScrollController1_25 implements ScrcpyScrollController {
    serializeScrollMessage(
        message: ScrcpyInjectScrollControlMessage,
    ): Uint8Array | undefined {
        return ScrcpyInjectScrollControlMessage1_25.serialize(message);
    }
}
