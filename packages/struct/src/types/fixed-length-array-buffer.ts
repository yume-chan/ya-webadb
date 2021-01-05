import { BuiltInFieldType, FieldDescriptorBaseOptions, GlobalStructFieldRuntimeTypeRegistry } from '../runtime';
import { ArrayBufferLikeFieldDescriptor, ArrayBufferLikeFieldRuntimeValue } from './array-buffer';

export namespace FixedLengthArrayBufferFieldDescriptor {
    export interface Options extends FieldDescriptorBaseOptions {
        length: number;
    }
}

export interface FixedLengthArrayBufferFieldDescriptor<
    TName extends string = string,
    TType extends ArrayBufferLikeFieldDescriptor.SubType = ArrayBufferLikeFieldDescriptor.SubType,
    TTypeScriptType = ArrayBufferLikeFieldDescriptor.TypeScriptType<TType>,
    TOptions extends FixedLengthArrayBufferFieldDescriptor.Options = FixedLengthArrayBufferFieldDescriptor.Options
    > extends ArrayBufferLikeFieldDescriptor<
    TName,
    TType,
    Record<TName, TTypeScriptType>,
    Record<TName, TTypeScriptType>,
    TOptions
    > {
    type: BuiltInFieldType.FixedLengthArrayBufferLike;

    options: TOptions;
};

class FixedLengthArrayBufferFieldRuntimeValue
    extends ArrayBufferLikeFieldRuntimeValue<FixedLengthArrayBufferFieldDescriptor>{
    public static getSize(descriptor: FixedLengthArrayBufferFieldDescriptor) {
        return descriptor.options.length;
    }
}

GlobalStructFieldRuntimeTypeRegistry.register(
    BuiltInFieldType.FixedLengthArrayBufferLike,
    FixedLengthArrayBufferFieldRuntimeValue,
);
