import Struct from "@yume-chan/struct";

export const ScrcpyInjectTextControlMessage =
    /* #__PURE__ */
    new Struct()
        .uint8("type")
        .uint32("length")
        .string("text", { lengthField: "length" });

export type ScrcpyInjectTextControlMessage =
    (typeof ScrcpyInjectTextControlMessage)["TInit"];
