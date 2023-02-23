import Struct, { placeholder } from "@yume-chan/struct";

import type {
    AndroidKeyEventAction,
    ScrcpyBackOrScreenOnControlMessage,
} from "../control/index.js";
import { ScrcpyControlMessageType } from "../control/index.js";

import type { ScrcpyOptionsInit1_16 } from "./1_16/options.js";
import {
    ScrcpyBackOrScreenOnControlMessage1_16,
    ScrcpyOptions1_16,
} from "./1_16/options.js";

export interface ScrcpyOptionsInit1_18 extends ScrcpyOptionsInit1_16 {
    powerOffOnClose: boolean;
}

export const ScrcpyBackOrScreenOnControlMessage1_18 = new Struct()
    .fields(ScrcpyBackOrScreenOnControlMessage1_16)
    .uint8("action", placeholder<AndroidKeyEventAction>());

export type ScrcpyBackOrScreenOnControlMessage1_18 =
    (typeof ScrcpyBackOrScreenOnControlMessage1_18)["TInit"];

export class ScrcpyOptions1_18<
    T extends ScrcpyOptionsInit1_18 = ScrcpyOptionsInit1_18
> extends ScrcpyOptions1_16<T> {
    constructor(value: Partial<ScrcpyOptionsInit1_18>) {
        super(value);
    }

    protected override getArgumentOrder(): (keyof T)[] {
        return super.getArgumentOrder().concat(["powerOffOnClose"]);
    }

    public override getDefaultValue(): T {
        return {
            ...super.getDefaultValue(),
            powerOffOnClose: false,
        };
    }

    public override getOutputEncoderNameRegex(): RegExp {
        return /\s+scrcpy --encoder '(.*?)'/;
    }

    public override getControlMessageTypes(): ScrcpyControlMessageType[] {
        /**
         *  0 InjectKeycode
         *  1 InjectText
         *  2 InjectTouch
         *  3 InjectScroll
         *  4 BackOrScreenOn
         *  5 ExpandNotificationPanel
         *  6 ExpandSettingsPanel
         *  7 CollapseNotificationPanel
         *  8 GetClipboard
         *  9 SetClipboard
         * 10 SetScreenPowerMode
         * 11 RotateDevice
         */
        const types = super.getControlMessageTypes();
        types.splice(6, 0, ScrcpyControlMessageType.ExpandSettingPanel);
        return types;
    }

    public override serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnControlMessage
    ) {
        return ScrcpyBackOrScreenOnControlMessage1_18.serialize(message);
    }
}
