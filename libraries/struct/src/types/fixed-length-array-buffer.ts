import { ArrayBufferLikeFieldDefinition, ArrayBufferLikeFieldType } from './array-buffer';

export interface FixedLengthArrayBufferLikeFieldOptions {
    length: number;
}

export class FixedLengthArrayBufferLikeFieldDefinition<
    TType extends ArrayBufferLikeFieldType = ArrayBufferLikeFieldType,
    TOptions extends FixedLengthArrayBufferLikeFieldOptions = FixedLengthArrayBufferLikeFieldOptions,
    > extends ArrayBufferLikeFieldDefinition<
    TType,
    TOptions
    > {
    getSize(): number {
        return this.options.length;
    }
};
