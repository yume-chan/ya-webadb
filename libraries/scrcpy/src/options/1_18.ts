import Struct, { placeholder } from "@yume-chan/struct";
import { AndroidKeyEventAction, ScrcpyControlMessageType } from "../message.js";
import { ScrcpyBackOrScreenOnEvent1_16, ScrcpyOptions1_16, type ScrcpyOptionsInit1_16 } from "./1_16/index.js";

export interface ScrcpyOptionsInit1_18 extends ScrcpyOptionsInit1_16 {
    powerOffOnClose: boolean;
}

export const ScrcpyBackOrScreenOnEvent1_18 =
    new Struct()
        .fields(ScrcpyBackOrScreenOnEvent1_16)
        .uint8('action', placeholder<AndroidKeyEventAction>());

export type ScrcpyBackOrScreenOnEvent1_18 = typeof ScrcpyBackOrScreenOnEvent1_18["TInit"];

export class ScrcpyOptions1_18<T extends ScrcpyOptionsInit1_18 = ScrcpyOptionsInit1_18> extends ScrcpyOptions1_16<T> {
    constructor(value: Partial<ScrcpyOptionsInit1_18>) {
        super(value);
    }

    protected override getArgumentOrder(): (keyof T)[] {
        return super.getArgumentOrder().concat(['powerOffOnClose']);
    }

    protected override getDefaultValue(): T {
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
        message: ScrcpyBackOrScreenOnEvent1_18,
    ) {
        return ScrcpyBackOrScreenOnEvent1_18.serialize(message);
    }
}
