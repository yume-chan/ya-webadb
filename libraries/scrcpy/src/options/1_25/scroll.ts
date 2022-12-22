import Struct, {
    NumberFieldDefinition,
    NumberFieldType,
} from "@yume-chan/struct";

import {
    ScrcpyControlMessageType,
    type ScrcpyInjectScrollControlMessage,
} from "../../control/index.js";
import { type ScrcpyScrollController } from "../1_16/index.js";

const Int16Max = (1 << 15) - 1;

const ScrcpyFloatToInt16NumberType: NumberFieldType = {
    size: 2,
    signed: true,
    deserialize(array, littleEndian) {
        const value = NumberFieldType.Int16.deserialize(array, littleEndian);
        return value / Int16Max;
    },
    serialize(dataView, offset, value, littleEndian) {
        value = value * Int16Max;
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
    typeof ScrcpyInjectScrollControlMessage1_25["TInit"];

export class ScrcpyScrollController1_25 implements ScrcpyScrollController {
    serializeScrollMessage(
        message: ScrcpyInjectScrollControlMessage
    ): Uint8Array | undefined {
        return ScrcpyInjectScrollControlMessage1_25.serialize(message);
    }
}
