// cspell: ignore autosync

import Struct, { placeholder } from "@yume-chan/struct";

import type { ScrcpySetClipboardControlMessage } from "../control/index.js";

import type { ScrcpyOptionsInit1_18 } from "./1_18.js";
import { SCRCPY_OPTIONS_DEFAULT_1_18, ScrcpyOptions1_18 } from "./1_18.js";
import { ScrcpyOptionsBase, toScrcpyOptionValue } from "./types.js";

export interface ScrcpyOptionsInit1_21 extends ScrcpyOptionsInit1_18 {
    clipboardAutosync?: boolean;
}

function toSnakeCase(input: string): string {
    return input.replace(/([A-Z])/g, "_$1").toLowerCase();
}

export const ScrcpySetClipboardControlMessage1_21 = new Struct()
    .uint8("type")
    .uint64("sequence")
    .int8("paste", placeholder<boolean>())
    .uint32("length")
    .string("content", { lengthField: "length" });

export type ScrcpySetClipboardControlMessage1_21 =
    (typeof ScrcpySetClipboardControlMessage1_21)["TInit"];

export const SCRCPY_OPTIONS_DEFAULT_1_21 = {
    ...SCRCPY_OPTIONS_DEFAULT_1_18,
    clipboardAutosync: true,
} as const satisfies Required<ScrcpyOptionsInit1_21>;

export class ScrcpyOptions1_21 extends ScrcpyOptionsBase<
    ScrcpyOptionsInit1_21,
    ScrcpyOptions1_18
> {
    public static serialize<T extends object>(
        options: T,
        defaults: Required<T>
    ): string[] {
        // 1.21 changed the format of arguments
        return Object.entries(options)
            .map(
                ([key, value]) =>
                    [key, toScrcpyOptionValue(value, undefined)] as const
            )
            .filter(
                (pair): pair is [string, string] =>
                    pair[1] !== undefined &&
                    pair[1] !==
                        toScrcpyOptionValue(
                            defaults[pair[0] as keyof T],
                            undefined
                        )
            )
            .map(([key, value]) => `${toSnakeCase(key)}=${value}`);
    }

    public constructor(init: ScrcpyOptionsInit1_21) {
        super(new ScrcpyOptions1_18(init), {
            ...SCRCPY_OPTIONS_DEFAULT_1_21,
            ...init,
        });
    }

    public override getDefaults(): Required<ScrcpyOptionsInit1_21> {
        return SCRCPY_OPTIONS_DEFAULT_1_21;
    }

    public override serialize(): string[] {
        return ScrcpyOptions1_21.serialize(
            this.value,
            SCRCPY_OPTIONS_DEFAULT_1_21
        );
    }

    public override serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage
    ): Uint8Array {
        return ScrcpySetClipboardControlMessage1_21.serialize(message);
    }
}
