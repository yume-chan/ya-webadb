import { BufferLikeFieldDefinition, type BufferFieldSubType } from "./base.js";

export interface FixedLengthBufferLikeFieldOptions {
    length: number;
}

export class FixedLengthBufferLikeFieldDefinition<
    TType extends BufferFieldSubType = BufferFieldSubType,
    TOptions extends FixedLengthBufferLikeFieldOptions = FixedLengthBufferLikeFieldOptions,
    > extends BufferLikeFieldDefinition<
    TType,
    TOptions
    > {
    public getSize(): number {
        return this.options.length;
    }
};
