import { getRuntimeValue, setRuntimeValue, StructOptions, StructSerializationContext } from '../basic';
import { ArrayBufferLikeFieldDefinition, ArrayBufferLikeFieldRuntimeValue, ArrayBufferLikeFieldType } from './array-buffer';
import { NumberFieldDefinition, NumberFieldRuntimeValue } from './number';
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

    public createValue(
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        object: any
    ): VariableLengthArrayBufferLikeFieldRuntimeValue {
        return new VariableLengthArrayBufferLikeFieldRuntimeValue(this, options, context, object);
    }
}

class VariableLengthArrayBufferLikeLengthFieldRuntimeValue extends NumberFieldRuntimeValue {
    protected arrayBufferValue: VariableLengthArrayBufferLikeFieldRuntimeValue;

    public constructor(
        definition: NumberFieldDefinition,
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        object: any,
        arrayBufferValue: VariableLengthArrayBufferLikeFieldRuntimeValue,
    ) {
        super(definition, options, context, object);
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

class VariableLengthArrayBufferLikeFieldRuntimeValue
    extends ArrayBufferLikeFieldRuntimeValue<VariableLengthArrayBufferLikeFieldDefinition> {
    public static getSize() {
        return 0;
    }

    protected length: number | undefined;

    protected lengthFieldValue: VariableLengthArrayBufferLikeLengthFieldRuntimeValue;

    public constructor(
        descriptor: VariableLengthArrayBufferLikeFieldDefinition,
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        object: any
    ) {
        super(descriptor, options, context, object);

        const lengthField = this.definition.options.lengthField;
        const oldValue = getRuntimeValue(object, lengthField) as NumberFieldRuntimeValue;
        this.lengthFieldValue = new VariableLengthArrayBufferLikeLengthFieldRuntimeValue(
            oldValue.definition,
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
            if (this.arrayBuffer !== undefined) {
                this.length = this.arrayBuffer.byteLength;
            } else {
                this.length = this.definition.type.getSize(this.typedValue);
                if (this.length === -1) {
                    this.arrayBuffer = this.definition.type.toArrayBuffer(this.typedValue, this.context);
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
