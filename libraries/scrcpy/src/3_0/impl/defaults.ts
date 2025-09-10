import type { Init } from "./init.js";
import { PrevImpl } from "./prev.js";

export const Defaults = {
    ...{
        ...PrevImpl.Defaults,
        // Remove obsolete values
        // replies on minifier to flatten the nested spread
        lockVideoOrientation: undefined,
    },

    captureOrientation: undefined,
    angle: 0,
    screenOffTimeout: undefined,
    listApps: false,
    newDisplay: undefined,
    vdSystemDecorations: true,
} as const satisfies Required<Init<true>>;
