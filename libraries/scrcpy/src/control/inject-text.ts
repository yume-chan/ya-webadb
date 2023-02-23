import Struct from "@yume-chan/struct";

import { ScrcpyControlMessageType } from "./type.js";

export const ScrcpyInjectTextControlMessage = new Struct()
    .uint8("type", ScrcpyControlMessageType.InjectText as const)
    .uint32("length")
    .string("text", { lengthField: "length" });

export type ScrcpyInjectTextControlMessage =
    (typeof ScrcpyInjectTextControlMessage)["TInit"];
