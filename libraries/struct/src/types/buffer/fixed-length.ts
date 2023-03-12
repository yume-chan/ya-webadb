import type { BufferFieldSubType } from "./base.js";
import { BufferLikeFieldDefinition } from "./base.js";

export interface FixedLengthBufferLikeFieldOptions {
    length: number;
}

export class FixedLengthBufferLikeFieldDefinition<
    TType extends BufferFieldSubType = BufferFieldSubType,
    TOptions extends FixedLengthBufferLikeFieldOptions = FixedLengthBufferLikeFieldOptions,
    TTypeScriptType = TType["TTypeScriptType"]
> extends BufferLikeFieldDefinition<TType, TOptions, never, TTypeScriptType> {
    public getSize(): number {
        return this.options.length;
    }
}
