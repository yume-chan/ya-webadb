import type { PrevImpl } from "./prev.js";

export type LogLevel = "verbose" | "debug" | "info" | "warn" | "error";

export const VideoOrientation = {
    Initial: -2,
    Unlocked: -1,
    Portrait: 0,
    Landscape: 1,
    PortraitFlipped: 2,
    LandscapeFlipped: 3,
} as const;

export type VideoOrientation =
    (typeof VideoOrientation)[keyof typeof VideoOrientation];

export interface Init
    extends Omit<PrevImpl.Init, "logLevel" | "lockVideoOrientation"> {
    logLevel?: LogLevel;

    lockVideoOrientation?: VideoOrientation;

    powerOffOnClose?: boolean;
}
