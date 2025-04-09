import type { Init } from "./init.js";
import { VideoOrientation } from "./init.js";

export const Defaults = {
    logLevel: "debug",
    maxSize: 0,
    bitRate: 8_000_000,
    maxFps: 0,
    lockVideoOrientation: VideoOrientation.Unlocked,
    tunnelForward: false,
    crop: undefined,
    sendFrameMeta: true,
    control: true,
    displayId: 0,
    showTouches: false,
    stayAwake: false,
    codecOptions: undefined,
} as const satisfies Required<Init>;
