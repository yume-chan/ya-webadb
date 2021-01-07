import { StructOptions, StructSerializationContext } from '../basic';
import { ArrayBufferLikeFieldDefinition, ArrayBufferLikeFieldRuntimeValue, ArrayBufferLikeFieldType } from './array-buffer';

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
    public getSize(): number {
        return this.options.length;
    }

    public createValue(
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        object: any,
        value: TType['valueType']
    ): ArrayBufferLikeFieldRuntimeValue<FixedLengthArrayBufferLikeFieldDefinition<TType, TOptions>> {
        return new ArrayBufferLikeFieldRuntimeValue(this, options, context, object, value);
    }
};
