import Struct, { placeholder } from "@yume-chan/struct";

import type {
    AndroidKeyEventAction,
    ScrcpyBackOrScreenOnControlMessage,
} from "../control/index.js";
import { ScrcpyControlMessageType } from "../control/index.js";

import {
    SCRCPY_CONTROL_MESSAGE_TYPES_1_16,
    ScrcpyBackOrScreenOnControlMessage1_16,
    ScrcpyLogLevel1_16,
    ScrcpyOptions1_16,
    ScrcpyVideoOrientation1_16,
} from "./1_16/index.js";
import type { ScrcpyOptionsInit1_17 } from "./1_17.js";
import { ScrcpyOptions1_17 } from "./1_17.js";
import type { ScrcpyEncoder } from "./types.js";
import { ScrcpyOptionsBase } from "./types.js";

export enum ScrcpyLogLevel1_18 {
    Verbose = "verbose",
    Debug = "debug",
    Info = "info",
    Warn = "warn",
    Error = "error",
}

export enum ScrcpyVideoOrientation1_18 {
    Initial = -2,
    Unlocked = -1,
    Portrait = 0,
    Landscape = 1,
    PortraitFlipped = 2,
    LandscapeFlipped = 3,
}

export interface ScrcpyOptionsInit1_18
    extends Omit<ScrcpyOptionsInit1_17, "logLevel" | "lockVideoOrientation"> {
    logLevel?: ScrcpyLogLevel1_18;

    lockVideoOrientation?: ScrcpyVideoOrientation1_18;

    powerOffOnClose?: boolean;
}

export const ScrcpyBackOrScreenOnControlMessage1_18 = new Struct()
    .concat(ScrcpyBackOrScreenOnControlMessage1_16)
    .uint8("action", placeholder<AndroidKeyEventAction>());

export type ScrcpyBackOrScreenOnControlMessage1_18 =
    (typeof ScrcpyBackOrScreenOnControlMessage1_18)["TInit"];

export const SCRCPY_CONTROL_MESSAGE_TYPES_1_18 =
    SCRCPY_CONTROL_MESSAGE_TYPES_1_16.slice();
SCRCPY_CONTROL_MESSAGE_TYPES_1_18.splice(
    6,
    0,
    ScrcpyControlMessageType.ExpandSettingPanel
);

const LOG_LEVEL_MAP = {
    [ScrcpyLogLevel1_18.Verbose]: ScrcpyLogLevel1_16.Debug,
    [ScrcpyLogLevel1_18.Debug]: ScrcpyLogLevel1_16.Debug,
    [ScrcpyLogLevel1_18.Info]: ScrcpyLogLevel1_16.Info,
    [ScrcpyLogLevel1_18.Warn]: ScrcpyLogLevel1_16.Warn,
    [ScrcpyLogLevel1_18.Error]: ScrcpyLogLevel1_16.Error,
};

const VIDEO_ORIENTATION_MAP = {
    [ScrcpyVideoOrientation1_18.Initial]: ScrcpyVideoOrientation1_16.Unlocked,
    [ScrcpyVideoOrientation1_18.Unlocked]: ScrcpyVideoOrientation1_16.Unlocked,
    [ScrcpyVideoOrientation1_18.Portrait]: ScrcpyVideoOrientation1_16.Portrait,
    [ScrcpyVideoOrientation1_18.Landscape]:
        ScrcpyVideoOrientation1_16.Landscape,
    [ScrcpyVideoOrientation1_18.PortraitFlipped]:
        ScrcpyVideoOrientation1_16.PortraitFlipped,
    [ScrcpyVideoOrientation1_18.LandscapeFlipped]:
        ScrcpyVideoOrientation1_16.LandscapeFlipped,
};
export class ScrcpyOptions1_18 extends ScrcpyOptionsBase<
    ScrcpyOptionsInit1_18,
    ScrcpyOptions1_17
> {
    public static readonly DEFAULTS = {
        ...ScrcpyOptions1_17.DEFAULTS,
        logLevel: ScrcpyLogLevel1_18.Debug,
        lockVideoOrientation: ScrcpyVideoOrientation1_18.Unlocked,
        powerOffOnClose: false,
    } as const satisfies Required<ScrcpyOptionsInit1_18>;

    public static readonly SERIALIZE_ORDER = [
        ...ScrcpyOptions1_17.SERIALIZE_ORDER,
        "powerOffOnClose",
    ] as const satisfies readonly (keyof ScrcpyOptionsInit1_18)[];

    public override get defaults(): Required<ScrcpyOptionsInit1_18> {
        return ScrcpyOptions1_18.DEFAULTS;
    }

    public override get controlMessageTypes() {
        return SCRCPY_CONTROL_MESSAGE_TYPES_1_18;
    }

    constructor(init: ScrcpyOptionsInit1_18) {
        const value = { ...ScrcpyOptions1_18.DEFAULTS, ...init };
        super(
            new ScrcpyOptions1_17({
                ...init,
                logLevel: LOG_LEVEL_MAP[value.logLevel],
                lockVideoOrientation:
                    VIDEO_ORIENTATION_MAP[value.lockVideoOrientation],
            }),
            value
        );
    }

    public serialize(): string[] {
        return ScrcpyOptions1_16.serialize(
            this.value,
            ScrcpyOptions1_18.SERIALIZE_ORDER
        );
    }

    public override parseEncoder(line: string): ScrcpyEncoder | undefined {
        return ScrcpyOptions1_17.parseEncoder(
            line,
            /\s+scrcpy --encoder '(.*?)'/
        );
    }

    public override serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnControlMessage
    ) {
        return ScrcpyBackOrScreenOnControlMessage1_18.serialize(message);
    }
}
