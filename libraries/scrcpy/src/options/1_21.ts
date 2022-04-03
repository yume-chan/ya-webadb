// cspell: ignore autosync

import { ScrcpyOptions1_18, type ScrcpyOptionsInit1_18 } from './1_18.js';
import { toScrcpyOptionValue } from "./common.js";

export interface ScrcpyOptionsInit1_21 extends ScrcpyOptionsInit1_18 {
    clipboardAutosync?: boolean;
}

function toSnakeCase(input: string): string {
    return input.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export class ScrcpyOptions1_21<T extends ScrcpyOptionsInit1_21 = ScrcpyOptionsInit1_21> extends ScrcpyOptions1_18<T> {
    public constructor(init: Partial<ScrcpyOptionsInit1_21>) {
        super(init);
    }

    protected override getDefaultValue(): T {
        return {
            ...super.getDefaultValue(),
            clipboardAutosync: true,
        };
    }

    public override formatServerArguments(): string[] {
        // 1.21 changed the format of arguments
        // So `getArgumentOrder()` is no longer needed
        return Object.entries(this.value)
            .map(([key, value]) => [key, toScrcpyOptionValue(value, undefined)] as const)
            .filter((pair): pair is [string, string] => pair[1] !== undefined)
            .map(([key, value]) => `${toSnakeCase(key)}=${value}`);
    }
}
