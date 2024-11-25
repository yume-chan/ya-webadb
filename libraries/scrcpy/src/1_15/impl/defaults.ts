import type { Init } from "./init.js";
import { CodecOptions, VideoOrientation } from "./init.js";

export const Defaults = /* #__PURE__ */ (() =>
    ({
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
        codecOptions: CodecOptions.Empty,
    }) as const satisfies Required<Init>)();
