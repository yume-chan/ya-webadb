import Struct from "@yume-chan/struct";

export const ScrcpyInjectTextControlMessage = new Struct()
    .uint8("type")
    .uint32("length")
    .string("text", { lengthField: "length" });

export type ScrcpyInjectTextControlMessage =
    (typeof ScrcpyInjectTextControlMessage)["TInit"];
