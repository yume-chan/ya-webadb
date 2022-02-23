import { BufferFieldSubType, BufferLikeFieldDefinition } from './base';

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
