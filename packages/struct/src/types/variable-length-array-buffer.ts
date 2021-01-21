import { StructFieldValue, StructOptions, StructSerializationContext, StructValue } from '../basic';
import type { KeysOfType } from '../utils';
import { ArrayBufferLikeFieldDefinition, ArrayBufferLikeFieldType, ArrayBufferLikeFieldValue } from './array-buffer';

export type LengthField<TFields> = KeysOfType<TFields, number | string>;

export interface VariableLengthArrayBufferLikeFieldOptions<
    TFields = object,
    TLengthField extends LengthField<TFields> = any,
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

    protected getDeserializeSize(struct: StructValue) {
        let value = struct.value[this.options.lengthField] as number | string;
        if (typeof value === 'string') {
            value = Number.parseInt(value, 10);
        }
        return value;
    }

    public create(
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        struct: StructValue,
        value: TType['TTypeScriptType'],
        arrayBuffer?: ArrayBuffer
    ): VariableLengthArrayBufferLikeStructFieldValue<this> {
        return new VariableLengthArrayBufferLikeStructFieldValue(
            this,
            options,
            context,
            struct,
            value,
            arrayBuffer,
        );
    }
}

export class VariableLengthArrayBufferLikeStructFieldValue<
    TDefinition extends VariableLengthArrayBufferLikeFieldDefinition = VariableLengthArrayBufferLikeFieldDefinition,
    > extends ArrayBufferLikeFieldValue<TDefinition> {
    protected length: number | undefined;

    protected lengthFieldValue: VariableLengthArrayBufferLikeFieldLengthValue;

    public constructor(
        definition: TDefinition,
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        struct: StructValue,
        value: TDefinition['TValue'],
        arrayBuffer?: ArrayBuffer,
    ) {
        super(definition, options, context, struct, value, arrayBuffer);

        if (arrayBuffer) {
            this.length = arrayBuffer.byteLength;
        }

        // Patch the associated length field.
        const lengthField = this.definition.options.lengthField;

        const originalValue = struct.get(lengthField);
        this.lengthFieldValue = new VariableLengthArrayBufferLikeFieldLengthValue(
            originalValue,
            this,
        );
        struct.set(lengthField, this.lengthFieldValue);
    }

    public getSize() {
        if (this.length === undefined) {
            this.length = this.definition.type.getSize(this.value);
            if (this.length === -1) {
                this.arrayBuffer = this.definition.type.toArrayBuffer(this.value, this.context);
                this.length = this.arrayBuffer.byteLength;
            }
        }

        return this.length;
    }

    public set(value: unknown) {
        super.set(value);
        this.arrayBuffer = undefined;
        this.length = undefined;
    }
}

export class VariableLengthArrayBufferLikeFieldLengthValue
    extends StructFieldValue {
    protected originalField: StructFieldValue;

    protected arrayBufferField: StructFieldValue;

    public constructor(
        originalField: StructFieldValue,
        arrayBufferField: StructFieldValue,
    ) {
        super(originalField.definition, originalField.options, originalField.context, originalField.struct, 0);
        this.originalField = originalField;
        this.arrayBufferField = arrayBufferField;
    }

    public getSize() {
        return this.originalField.getSize();
    }

    get() {
        let value: string | number = this.arrayBufferField.getSize();

        const originalValue = this.originalField.get();
        if (typeof originalValue === 'string') {
            value = value.toString();
        }

        return value;
    }

    set() { }

    serialize(dataView: DataView, offset: number, context: StructSerializationContext) {
        this.originalField.set(this.get());
        this.originalField.serialize(dataView, offset, context);
    }
}
