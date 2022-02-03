import { ScrcpyOptions1_18, ScrcpyOptions1_18Type } from './1_18';
import { toScrcpyOptionValue } from "./common";

export interface ScrcpyOptions1_21Type extends ScrcpyOptions1_18Type {
    clipboardAutosync?: boolean;
}

function toSnakeCase(input: string): string {
    return input.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export class ScrcpyOptions1_21<T extends ScrcpyOptions1_21Type = ScrcpyOptions1_21Type> extends ScrcpyOptions1_18<T> {
    public constructor(init: Partial<ScrcpyOptions1_21Type>) {
        super(init);
    }

    protected override getDefaultValue(): T {
        return {
            ...super.getDefaultValue(),
            clipboardAutosync: true,
        };
    }

    public override formatServerArguments(): string[] {
        return Object.entries(this.value)
            .map(([key, value]) => [key, toScrcpyOptionValue(value, undefined)] as const)
            .filter((pair): pair is [string, string] => pair[1] !== undefined)
            .map(([key, value]) => `${toSnakeCase(key)}=${value}`);
    }
}
