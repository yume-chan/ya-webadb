import { Adb } from "@yume-chan/adb";
import Struct, { placeholder } from "@yume-chan/struct";
import { AndroidKeyEventAction, ScrcpyControlMessageType } from "../message";
import { ScrcpyOptions1_17, ScrcpyOptions1_17Init } from "./1_17";
import { ScrcpyLogLevel, ScrcpyScreenOrientation } from "./common";

export interface ScrcpyOptions1_18Init extends ScrcpyOptions1_17Init {
    powerOffOnClose?: boolean;
}

export const ScrcpyBackOrScreenOnEvent1_18 =
    new Struct()
        .uint8('type', placeholder<ScrcpyControlMessageType.BackOrScreenOn>())
        .uint8('action', placeholder<AndroidKeyEventAction>());

export class ScrcpyOptions1_18 extends ScrcpyOptions1_17 {
    powerOffOnClose: boolean;

    constructor(init: ScrcpyOptions1_18Init) {
        super(init);
        const {
            logLevel = ScrcpyLogLevel.Error,
            orientation = ScrcpyScreenOrientation.Unlocked,
            powerOffOnClose = false,
        } = init;
        this.logLevel = logLevel;
        this.orientation = orientation;
        this.powerOffOnClose = powerOffOnClose;
    }

    public override formatServerArguments(): string[] {
        return [
            ...super.formatServerArguments(),
            this.powerOffOnClose.toString()
        ];
    }

    public override formatGetEncoderListArguments(): string[] {
        return [
            ...super.formatGetEncoderListArguments(),
            this.powerOffOnClose.toString()
        ];
    }

    public override getOutputEncoderNameRegex(): RegExp {
        return /^\s+scrcpy --encoder '(.*?)'/;
    }

    public createBackOrScreenOnEvent(action: AndroidKeyEventAction, device: Adb) {
        return ScrcpyBackOrScreenOnEvent1_18.serialize(
            {
                type: ScrcpyControlMessageType.BackOrScreenOn,
                action,
            },
            device.backend
        );
    }
}
