// cspell: ignore autosync

import Struct, { placeholder } from "@yume-chan/struct";

import { type ScrcpySetClipboardControlMessage } from "../control/index.js";

import { ScrcpyOptions1_18, type ScrcpyOptionsInit1_18 } from "./1_18.js";
import { toScrcpyOptionValue } from "./types.js";

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
    typeof ScrcpySetClipboardControlMessage1_21["TInit"];

export class ScrcpyOptions1_21<
    T extends ScrcpyOptionsInit1_21 = ScrcpyOptionsInit1_21
> extends ScrcpyOptions1_18<T> {
    public constructor(init: Partial<ScrcpyOptionsInit1_21>) {
        super(init);
    }

    public override getDefaultValues(): T {
        return Object.assign(super.getDefaultValues(), {
            clipboardAutosync: true,
        } satisfies Omit<ScrcpyOptionsInit1_21, keyof ScrcpyOptionsInit1_18>);
    }

    public override serializeServerArguments(): string[] {
        // 1.21 changed the format of arguments
        // `getArgumentOrder()` is no longer used
        const defaults = this.getDefaultValues();
        return Object.entries(this.value)
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

    public override serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage
    ): Uint8Array {
        return ScrcpySetClipboardControlMessage1_21.serialize(message);
    }
}
