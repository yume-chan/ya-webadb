import { ScrcpyOptions1_18, ScrcpyOptions1_18Type } from './1_18';
import { toScrcpyOption } from "./common";

export interface ScrcpyOptions1_21Type extends ScrcpyOptions1_18Type {
    clipboardAutosync?: boolean;
}

function toSnakeCase(input: string): string {
    return input.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export class ScrcpyOptions1_21<T extends ScrcpyOptions1_21Type = ScrcpyOptions1_21Type> extends ScrcpyOptions1_18<T> {
    public constructor(init: Partial<ScrcpyOptions1_21Type>) {
        super(init);
        const {
            clipboardAutosync = true,
        } = init;
        this.value.clipboardAutosync = clipboardAutosync;
    }

    public override formatServerArguments(): string[] {
        return Object.entries(this.value)
            .map(([key, value]) => {
                return `${toSnakeCase(key)}=${toScrcpyOption(value, '')}`;
            });
    }

    public override formatGetEncoderListArguments(): string[] {
        return Object.entries(this.value).map(([key, value]) => {
            if (key === 'encoderName') {
                value = '_';
            }

            return `${toSnakeCase(key)}=${toScrcpyOption(value, '')}`;
        });
    }
}
