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
    constructor(init: Partial<ScrcpyOptions1_18Type>) {
        super(init);
        const {
            powerOffOnClose = false,
        } = init;
        this.value.powerOffOnClose = powerOffOnClose;
    }

    protected override getArgumnetOrder(): (keyof T)[] {
        return super.getArgumnetOrder().concat(['powerOffOnClose']);
    }

    public override getOutputEncoderNameRegex(): RegExp {
        return /\s+scrcpy --encoder '(.*?)'/;
    }

    public override createBackOrScreenOnEvent(action: AndroidKeyEventAction, device: Adb) {
        return ScrcpyBackOrScreenOnEvent1_18.serialize(
            {
                type: ScrcpyControlMessageType.BackOrScreenOn,
                action,
            }
        );
    }
}
