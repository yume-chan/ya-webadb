import { FieldRuntimeValue, getRuntimeValue, setRuntimeValue, StructOptions, StructSerializationContext } from '../basic';
import { ArrayBufferLikeFieldDefinition, ArrayBufferLikeFieldRuntimeValue, ArrayBufferLikeFieldType } from './array-buffer';
import { KeysOfType } from './utils';

export interface VariableLengthArrayBufferLikeFieldOptions<
    TInit = object,
    TLengthField extends KeysOfType<TInit, number | string> = any,
    > {
    lengthField: TLengthField;
}

export class VariableLengthArrayBufferLikeFieldDefinition<
    TType extends ArrayBufferLikeFieldType = ArrayBufferLikeFieldType,
    TOptions extends VariableLengthArrayBufferLikeFieldOptions = VariableLengthArrayBufferLikeFieldOptions
    > extends ArrayBufferLikeFieldDefinition<
    TType,
    TOptions,
    TOptions['lengthField']
    > {
    public getSize(): number {
        return 0;
    }

    protected getDeserializeSize(object: any) {
        let value = object[this.options.lengthField] as number | string;
        if (typeof value === 'string') {
            value = Number.parseInt(value, 10);
        }
        return value;
    }

    public createValue(
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        object: any,
        value: TType['valueType'],
    ): VariableLengthArrayBufferLikeFieldRuntimeValue<TType, TOptions> {
        return new VariableLengthArrayBufferLikeFieldRuntimeValue(this, options, context, object, value);
    }
}

class VariableLengthArrayBufferLikeLengthFieldRuntimeValue extends FieldRuntimeValue {
    protected originalValue: FieldRuntimeValue;

    protected arrayBufferValue: VariableLengthArrayBufferLikeFieldRuntimeValue;

    public constructor(
        originalValue: FieldRuntimeValue,
        arrayBufferValue: VariableLengthArrayBufferLikeFieldRuntimeValue,
    ) {
        super(originalValue.definition, originalValue.options, originalValue.context, originalValue.object, 0);
        this.originalValue = originalValue;
        this.arrayBufferValue = arrayBufferValue;
    }

    public getSize() {
        return this.originalValue.getSize();
    }

    get() {
        // TODO: originalValue might be a `string` type, now it always returns `number`.
        return this.arrayBufferValue.getSize();
    }

    set() { }

    serialize(dataView: DataView, offset: number, context: StructSerializationContext) {
        this.originalValue.set(this.get());
        this.originalValue.serialize(dataView, offset, context);
    }
}

class VariableLengthArrayBufferLikeFieldRuntimeValue<
    TType extends ArrayBufferLikeFieldType = ArrayBufferLikeFieldType,
    TOptions extends VariableLengthArrayBufferLikeFieldOptions = VariableLengthArrayBufferLikeFieldOptions
    > extends ArrayBufferLikeFieldRuntimeValue<VariableLengthArrayBufferLikeFieldDefinition<TType, TOptions>> {
    public static getSize() {
        return 0;
    }

    protected length: number | undefined;

    protected lengthFieldValue: VariableLengthArrayBufferLikeLengthFieldRuntimeValue;

    public constructor(
        definition: VariableLengthArrayBufferLikeFieldDefinition<TType, TOptions>,
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        object: any,
        value: TType['valueType'],
    ) {
        super(definition, options, context, object, value);

        // Patch the associated length field.
        const lengthField = this.definition.options.lengthField;
        const originalValue = getRuntimeValue(object, lengthField);
        this.lengthFieldValue = new VariableLengthArrayBufferLikeLengthFieldRuntimeValue(originalValue, this);
        setRuntimeValue(object, lengthField, this.lengthFieldValue);
    }

    public getSize() {
        if (this.length === undefined) {
            if (this.arrayBuffer !== undefined) {
                this.length = this.arrayBuffer.byteLength;
            } else {
                this.length = this.definition.type.getSize(this.value);
                if (this.length === -1) {
                    this.arrayBuffer = this.definition.type.toArrayBuffer(this.value, this.context);
                    this.length = this.arrayBuffer.byteLength;
                }
            }
        }

        return this.length;
    }

    public set(value: unknown) {
        super.set(value);
        this.length = undefined;
    }
}
