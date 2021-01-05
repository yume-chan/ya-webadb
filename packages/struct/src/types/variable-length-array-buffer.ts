import { BuiltInFieldType, FieldDescriptorBaseOptions, getRuntimeValue, GlobalStructFieldRuntimeTypeRegistry, setRuntimeValue, StructOptions, StructSerializationContext } from '../runtime';
import { ArrayBufferLikeFieldDescriptor, ArrayBufferLikeFieldRuntimeValue } from './array-buffer';
import { NumberFieldDescriptor, NumberFieldRuntimeValue } from './number';
import { KeysOfType } from './utils';

export namespace VariableLengthArrayBufferFieldDescriptor {
    export interface Options<
        TInit = object,
        TLengthField extends KeysOfType<TInit, number | string> = any,
        > extends FieldDescriptorBaseOptions {
        lengthField: TLengthField;
    }
}

export interface VariableLengthArrayBufferFieldDescriptor<
    TName extends string = string,
    TType extends ArrayBufferLikeFieldDescriptor.SubType = ArrayBufferLikeFieldDescriptor.SubType,
    TInit = object,
    TLengthField extends KeysOfType<TInit, number | string> = any,
    TTypeScriptType = ArrayBufferLikeFieldDescriptor.TypeScriptType<TType>,
    TOptions extends VariableLengthArrayBufferFieldDescriptor.Options<TInit, TLengthField> = VariableLengthArrayBufferFieldDescriptor.Options<TInit, TLengthField>
    > extends ArrayBufferLikeFieldDescriptor<
    TName,
    TType,
    Record<TName, TTypeScriptType>,
    Record<TName, TTypeScriptType> & Record<TLengthField, never>,
    TOptions
    > {
    type: BuiltInFieldType.VariableLengthArrayBufferLike;

    options: TOptions;
}

class VariableLengthArrayBufferLengthFieldRuntimeValue extends NumberFieldRuntimeValue {
    protected arrayBufferValue: VariableLengthArrayBufferFieldRuntimeValue;

    public constructor(
        descriptor: NumberFieldDescriptor,
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        object: any,
        arrayBufferValue: VariableLengthArrayBufferFieldRuntimeValue,
    ) {
        super(descriptor, options, context, object);
        this.arrayBufferValue = arrayBufferValue;
    }

    getDeserializeSize() {
        return this.value;
    }

    get() {
        return this.arrayBufferValue.getSize();
    }

    set() { }

    serialize(dataView: DataView, offset: number) {
        this.value = this.get();
        super.serialize(dataView, offset);
    }
}

class VariableLengthArrayBufferFieldRuntimeValue
    extends ArrayBufferLikeFieldRuntimeValue<VariableLengthArrayBufferFieldDescriptor> {
    public static getSize() {
        return 0;
    }

    protected length: number | undefined;

    protected lengthFieldValue: VariableLengthArrayBufferLengthFieldRuntimeValue;

    public constructor(
        descriptor: VariableLengthArrayBufferFieldDescriptor,
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        object: any
    ) {
        super(descriptor, options, context, object);

        const lengthField = this.descriptor.options.lengthField;
        const oldValue = getRuntimeValue(object, lengthField) as NumberFieldRuntimeValue;
        this.lengthFieldValue = new VariableLengthArrayBufferLengthFieldRuntimeValue(
            oldValue.descriptor,
            this.options,
            this.context,
            object,
            this
        );
        setRuntimeValue(object, lengthField, this.lengthFieldValue);
    }

    protected getDeserializeSize() {
        const value = this.lengthFieldValue.getDeserializeSize() as number;
        return value;
    }

    public getSize() {
        if (this.length === undefined) {
            switch (this.descriptor.subType) {
                case ArrayBufferLikeFieldDescriptor.SubType.ArrayBuffer:
                    this.length = this.arrayBuffer!.byteLength;
                    break;
                case ArrayBufferLikeFieldDescriptor.SubType.Uint8ClampedArray:
                    this.length = this.typedArray!.byteLength;
                    break;
                case ArrayBufferLikeFieldDescriptor.SubType.String:
                    this.arrayBuffer = this.context.encodeUtf8(this.string!);
                    this.length = this.arrayBuffer.byteLength;
                    break;
            }
        }
        return this.length;
    }

    public set(value: unknown) {
        super.set(value);
        this.length = undefined;
    }
}

GlobalStructFieldRuntimeTypeRegistry.register(
    BuiltInFieldType.VariableLengthArrayBufferLike,
    VariableLengthArrayBufferFieldRuntimeValue,
);
