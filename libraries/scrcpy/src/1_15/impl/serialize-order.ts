import type { Init } from "./init.js";

export const SerializeOrder = [
    "logLevel",
    "maxSize",
    "bitRate",
    "maxFps",
    "lockVideoOrientation",
    "tunnelForward",
    "crop",
    "sendFrameMeta",
    "control",
    "displayId",
    "showTouches",
    "stayAwake",
    "codecOptions",
] as const satisfies readonly (keyof Init)[];
