import Struct, { placeholder } from "@yume-chan/struct";
import type { AndroidKeyEventAction } from "../message.js";
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

    public override serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnEvent1_18,
    ) {
        return ScrcpyBackOrScreenOnEvent1_18.serialize(message);
    }
}
