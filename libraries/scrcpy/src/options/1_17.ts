import type { ScrcpyOptionsInit1_16 } from "./1_16/index.js";
import {
    SCRCPY_OPTIONS_DEFAULT_1_16,
    SCRCPY_OPTIONS_ORDER_1_16,
    ScrcpyOptions1_16,
} from "./1_16/index.js";
import type { ScrcpyEncoder } from "./types.js";
import { ScrcpyOptionsBase } from "./types.js";

export interface ScrcpyOptionsInit1_17 extends ScrcpyOptionsInit1_16 {
    encoderName?: string | undefined;
}

export const SCRCPY_OPTIONS_DEFAULT_1_17 = {
    ...SCRCPY_OPTIONS_DEFAULT_1_16,
    encoderName: undefined,
} as const satisfies Required<ScrcpyOptionsInit1_17>;

export const SCRCPY_OPTIONS_ORDER_1_17 = [
    ...SCRCPY_OPTIONS_ORDER_1_16,
    "encoderName",
] as const satisfies readonly (keyof ScrcpyOptionsInit1_17)[];

export class ScrcpyOptions1_17 extends ScrcpyOptionsBase<
    ScrcpyOptionsInit1_17,
    ScrcpyOptions1_16
> {
    public static parseEncoder(
        line: string,
        encoderNameRegex: RegExp
    ): ScrcpyEncoder | undefined {
        const match = line.match(encoderNameRegex);
        if (match) {
            return { name: match[1]! };
        }
        return undefined;
    }

    public override get defaults(): Required<ScrcpyOptionsInit1_17> {
        return SCRCPY_OPTIONS_DEFAULT_1_17;
    }

    public constructor(init: ScrcpyOptionsInit1_17) {
        super(new ScrcpyOptions1_16(init), {
            ...SCRCPY_OPTIONS_DEFAULT_1_17,
            ...init,
        });
    }

    public override serialize(): string[] {
        return ScrcpyOptions1_16.serialize(
            this.value,
            SCRCPY_OPTIONS_ORDER_1_17
        );
    }

    public override parseEncoder(line: string): ScrcpyEncoder | undefined {
        return ScrcpyOptions1_17.parseEncoder(
            line,
            /\s+scrcpy --encoder-name '(.*?)'/
        );
    }
}
