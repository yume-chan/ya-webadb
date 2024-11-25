import type { Init } from "./init.js";
import { CaptureOrientation, NewDisplay } from "./init.js";
import { PrevImpl } from "./prev.js";

export const Defaults = {
    ...PrevImpl.Defaults,
    captureOrientation: CaptureOrientation.Default,
    angle: 0,
    screenOffTimeout: undefined,
    listApps: false,
    newDisplay: NewDisplay.Empty,
    vdSystemDecorations: true,
} as const satisfies Required<Init>;
