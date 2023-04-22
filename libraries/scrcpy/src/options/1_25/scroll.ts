import Struct, {
    NumberFieldDefinition,
    NumberFieldType,
} from "@yume-chan/struct";

import type { ScrcpyInjectScrollControlMessage } from "../../control/index.js";
import { ScrcpyControlMessageType } from "../../control/index.js";
import type { ScrcpyScrollController } from "../1_16/index.js";
import { clamp } from "../1_16/index.js";

export const ScrcpyFloatToInt16NumberType: NumberFieldType = {
    size: 2,
    signed: true,
    deserialize(array, littleEndian) {
        const value = NumberFieldType.Int16.deserialize(array, littleEndian);
        // https://github.com/Genymobile/scrcpy/blob/1f138aef41de651668043b32c4effc2d4adbfc44/server/src/main/java/com/genymobile/scrcpy/Binary.java#L34
        return value === 0x7fff ? 1 : value / 0x8000;
    },
    serialize(dataView, offset, value, littleEndian) {
        // https://github.com/Genymobile/scrcpy/blob/1f138aef41de651668043b32c4effc2d4adbfc44/app/src/util/binary.h#L65
        value = clamp(value, -1, 1);
        value = value === 1 ? 0x7fff : value * 0x8000;
        NumberFieldType.Int16.serialize(dataView, offset, value, littleEndian);
    },
};

const ScrcpyFloatToInt16FieldDefinition = new NumberFieldDefinition(
    ScrcpyFloatToInt16NumberType
);

export const ScrcpyInjectScrollControlMessage1_25 = new Struct()
    .uint8("type", ScrcpyControlMessageType.InjectScroll as const)
    .uint32("pointerX")
    .uint32("pointerY")
    .uint16("screenWidth")
    .uint16("screenHeight")
    .field("scrollX", ScrcpyFloatToInt16FieldDefinition)
    .field("scrollY", ScrcpyFloatToInt16FieldDefinition)
    .int32("buttons");

export type ScrcpyInjectScrollControlMessage1_25 =
    (typeof ScrcpyInjectScrollControlMessage1_25)["TInit"];

export class ScrcpyScrollController1_25 implements ScrcpyScrollController {
    serializeScrollMessage(
        message: ScrcpyInjectScrollControlMessage
    ): Uint8Array | undefined {
        return ScrcpyInjectScrollControlMessage1_25.serialize(message);
    }
}
