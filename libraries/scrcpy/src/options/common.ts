import type { Adb } from "@yume-chan/adb";
import type { ScrcpyClientConnection } from "../connection";

export const DEFAULT_SERVER_PATH = '/data/local/tmp/scrcpy-server.jar';

export enum ScrcpyLogLevel {
    Debug = 'debug',
    Info = 'info',
    Warn = 'warn',
    Error = 'error',
}

export enum ScrcpyScreenOrientation {
    Unlocked = -1,
    Portrait = 0,
    Landscape = 1,
    PortraitFlipped = 2,
    LandscapeFlipped = 3,
}

export interface ScrcpyOptions {
    formatServerArguments(): string[];

    formatGetEncoderListArguments(): string[];

    getOutputEncoderNameRegex(): RegExp;

    createConnection(device: Adb): ScrcpyClientConnection;
}
