import type { Adb } from "@yume-chan/adb";
import type { ScrcpyClientConnection } from "../connection";
import type { AndroidKeyEventAction } from "../message";

export const DEFAULT_SERVER_PATH = '/data/local/tmp/scrcpy-server.jar';

export enum ScrcpyLogLevel {
    Verbose = 'verbose',
    Debug = 'debug',
    Info = 'info',
    Warn = 'warn',
    Error = 'error',
}

export enum ScrcpyScreenOrientation {
    Initial = -2,
    Unlocked = -1,
    Portrait = 0,
    Landscape = 1,
    PortraitFlipped = 2,
    LandscapeFlipped = 3,
}

export interface ScrcpyOptions<T> {
    value: Partial<T>;

    formatServerArguments(): string[];

    getOutputEncoderNameRegex(): RegExp;

    createConnection(device: Adb): ScrcpyClientConnection;

    createBackOrScreenOnEvent(action: AndroidKeyEventAction, device: Adb): ArrayBuffer | undefined;
}

export interface ScrcpyOptionValue {
    toOptionValue(): string | undefined;
}

export function isScrcpyOptionValue(value: any): value is ScrcpyOptionValue {
    return typeof value === 'object' &&
        value !== null &&
        typeof value.toOptionValue === 'function';
}

export function toScrcpyOptionValue<T>(value: any, empty: T): string | T {
    if (isScrcpyOptionValue(value)) {
        value = value.toOptionValue();
    }

    if (value === undefined) {
        return empty;
    }

    return `${value}`;
}
