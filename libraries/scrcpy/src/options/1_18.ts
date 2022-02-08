import { type Adb } from "@yume-chan/adb";
import Struct, { placeholder } from "@yume-chan/struct";
import { type AndroidKeyEventAction, ScrcpyControlMessageType } from "../message";
import { ScrcpyOptions1_16, type ScrcpyOptions1_16Type } from "./1_16";

export interface ScrcpyOptions1_18Type extends ScrcpyOptions1_16Type {
    powerOffOnClose: boolean;
}

export const ScrcpyBackOrScreenOnEvent1_18 =
    new Struct()
        .uint8('type', placeholder<ScrcpyControlMessageType.BackOrScreenOn>())
        .uint8('action', placeholder<AndroidKeyEventAction>());

export class ScrcpyOptions1_18<T extends ScrcpyOptions1_18Type = ScrcpyOptions1_18Type> extends ScrcpyOptions1_16<T> {
    constructor(value: Partial<ScrcpyOptions1_18Type>) {
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

    public override serializeBackOrScreenOnControlMessage(action: AndroidKeyEventAction, device: Adb) {
        return ScrcpyBackOrScreenOnEvent1_18.serialize(
            {
                type: ScrcpyControlMessageType.BackOrScreenOn,
                action,
            }
        );
    }
}
