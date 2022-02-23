import { StructFieldDefinition, StructFieldValue, StructOptions, StructValue } from '../../basic';
import type { KeysOfType } from '../../utils';
import { BufferFieldSubType, BufferLikeFieldDefinition, BufferLikeFieldValue } from './base';

export type LengthField<TFields> = KeysOfType<TFields, number | string>;

export interface VariableLengthBufferLikeFieldOptions<
    TFields = object,
    TLengthField extends LengthField<TFields> = any,
    > {
    lengthField: TLengthField;

    lengthFieldBase?: number;
}

export class VariableLengthBufferLikeFieldDefinition<
    TType extends BufferFieldSubType = BufferFieldSubType,
    TOptions extends VariableLengthBufferLikeFieldOptions = VariableLengthBufferLikeFieldOptions
    > extends BufferLikeFieldDefinition<
    TType,
    TOptions,
    TOptions['lengthField']
    > {
    public getSize(): number {
        return 0;
    }

    protected override getDeserializeSize(struct: StructValue) {
        let value = struct.value[this.options.lengthField] as number | string;
        if (typeof value === 'string') {
            value = Number.parseInt(value, this.options.lengthFieldBase ?? 10);
        }
        return value;
    }

    public override create(
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TType['TTypeScriptType'],
        array?: Uint8Array
    ): VariableLengthBufferLikeStructFieldValue<this> {
        return new VariableLengthBufferLikeStructFieldValue(
            this,
            options,
            struct,
            value,
            array,
        );
    }
}

export class VariableLengthBufferLikeStructFieldValue<
    TDefinition extends VariableLengthBufferLikeFieldDefinition = VariableLengthBufferLikeFieldDefinition,
    > extends BufferLikeFieldValue<TDefinition> {
    protected length: number | undefined;

    protected lengthFieldValue: VariableLengthBufferLikeFieldLengthValue;

    public constructor(
        definition: TDefinition,
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TDefinition['TValue'],
        array?: Uint8Array,
    ) {
        super(definition, options, struct, value, array);

        if (array) {
            this.length = array.byteLength;
        }

        // Patch the associated length field.
        const lengthField = this.definition.options.lengthField;

        const originalValue = struct.get(lengthField);
        this.lengthFieldValue = new VariableLengthBufferLikeFieldLengthValue(
            originalValue,
            this,
        );
        struct.set(lengthField, this.lengthFieldValue);
    }

    public override getSize() {
        if (this.length === undefined) {
            this.length = this.definition.type.getSize(this.value);
            if (this.length === -1) {
                this.array = this.definition.type.toBuffer(this.value);
                this.length = this.array.byteLength;
            }
        }

        return this.length;
    }

    public override set(value: unknown) {
        super.set(value);
        this.array = undefined;
        this.length = undefined;
    }
}

// Not using `VariableLengthBufferLikeStructFieldValue` directly makes writing tests much easier...
type VariableLengthBufferLikeFieldValueLike =
    StructFieldValue<StructFieldDefinition<VariableLengthBufferLikeFieldOptions, any, any>>;

export class VariableLengthBufferLikeFieldLengthValue
    extends StructFieldValue {
    protected originalField: StructFieldValue;

    protected arrayBufferField: VariableLengthBufferLikeFieldValueLike;

    public constructor(
        originalField: StructFieldValue,
        arrayBufferField: VariableLengthBufferLikeFieldValueLike,
    ) {
        super(originalField.definition, originalField.options, originalField.struct, 0);
        this.originalField = originalField;
        this.arrayBufferField = arrayBufferField;
    }

    public override getSize() {
        return this.originalField.getSize();
    }

    public override get() {
        let value: string | number = this.arrayBufferField.getSize();

        const originalValue = this.originalField.get();
        if (typeof originalValue === 'string') {
            value = value.toString(this.arrayBufferField.definition.options.lengthFieldBase ?? 10);
        }

        return value;
    }

    public override set() { }

    serialize(dataView: DataView, offset: number) {
        this.originalField.set(this.get());
        this.originalField.serialize(dataView, offset);
    }
}
