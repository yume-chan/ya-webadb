import type { Init } from "./init.js";
import { VideoOrientation } from "./init.js";
import { PrevImpl } from "./prev.js";

export const Defaults = {
    ...PrevImpl.Defaults,
    logLevel: "debug",
    lockVideoOrientation: VideoOrientation.Unlocked,
    powerOffOnClose: false,
} as const satisfies Required<Init>;
