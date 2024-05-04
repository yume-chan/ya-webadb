/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
    StructFieldDefinition,
    StructOptions,
    StructValue,
} from "../../basic/index.js";
import { StructFieldValue } from "../../basic/index.js";
import type { KeysOfType } from "../../utils.js";

import type { BufferFieldConverter } from "./base.js";
import { BufferLikeFieldDefinition, BufferLikeFieldValue } from "./base.js";

export type LengthField<TFields> = KeysOfType<TFields, number | string>;

export interface VariableLengthBufferLikeFieldOptions<
    TFields extends object = object,
    TLengthField extends LengthField<TFields> = any,
> {
    /**
     * The name of the field that contains the length of the buffer.
     *
     * This field must be a `number` or `string` (can't be `bigint`) field.
     */
    lengthField: TLengthField;

    /**
     * If the `lengthField` refers to a string field,
     * what radix to use when converting the string to a number.
     *
     * @default 10
     */
    lengthFieldRadix?: number;
}

export class VariableLengthBufferLikeFieldDefinition<
    TConverter extends BufferFieldConverter = BufferFieldConverter,
    TOptions extends
        VariableLengthBufferLikeFieldOptions = VariableLengthBufferLikeFieldOptions,
    TTypeScriptType = TConverter["TTypeScriptType"],
> extends BufferLikeFieldDefinition<
    TConverter,
    TOptions,
    TOptions["lengthField"],
    TTypeScriptType
> {
    getSize(): number {
        return 0;
    }

    protected override getDeserializeSize(struct: StructValue) {
        let value = struct.value[this.options.lengthField] as number | string;
        if (typeof value === "string") {
            value = Number.parseInt(value, this.options.lengthFieldRadix ?? 10);
        }
        return value;
    }

    override create(
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TTypeScriptType,
        array?: Uint8Array,
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
    TDefinition extends
        VariableLengthBufferLikeFieldDefinition = VariableLengthBufferLikeFieldDefinition,
> extends BufferLikeFieldValue<TDefinition> {
    protected length: number | undefined;

    protected lengthFieldValue: VariableLengthBufferLikeFieldLengthValue;

    constructor(
        definition: TDefinition,
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TDefinition["TValue"],
        array?: Uint8Array,
    ) {
        super(definition, options, struct, value, array);

        if (array) {
            this.length = array.byteLength;
        }

        // Patch the associated length field.
        const lengthField = this.definition.options.lengthField as PropertyKey;

        const originalValue = struct.get(lengthField);
        this.lengthFieldValue = new VariableLengthBufferLikeFieldLengthValue(
            originalValue,
            this,
        );
        struct.set(lengthField, this.lengthFieldValue);
    }

    override getSize() {
        if (this.length !== undefined) {
            // Have cached length
            return this.length;
        }

        this.length = this.definition.converter.getSize(this.value);
        if (this.length !== undefined) {
            if (this.length < 0) {
                throw new Error("Invalid length");
            }

            // The converter knows the size
            return this.length;
        }

        // The converter doesn't know the size, so we need to convert to buffer first
        this.array = this.definition.converter.toBuffer(this.value);
        this.length = this.array.byteLength;
        return this.length;
    }

    override set(value: unknown) {
        super.set(value);
        this.array = undefined;
        this.length = undefined;
    }
}

// Not using `VariableLengthBufferLikeStructFieldValue` directly makes writing tests much easier...
type VariableLengthBufferLikeFieldValueLike = StructFieldValue<
    StructFieldDefinition<
        VariableLengthBufferLikeFieldOptions<any, any>,
        any,
        any
    >
>;

export class VariableLengthBufferLikeFieldLengthValue extends StructFieldValue<
    StructFieldDefinition<unknown, unknown, PropertyKey>
> {
    protected originalField: StructFieldValue<
        StructFieldDefinition<unknown, unknown, PropertyKey>
    >;

    protected bufferField: VariableLengthBufferLikeFieldValueLike;

    constructor(
        originalField: StructFieldValue<
            StructFieldDefinition<unknown, unknown, PropertyKey>
        >,
        arrayBufferField: VariableLengthBufferLikeFieldValueLike,
    ) {
        super(
            originalField.definition,
            originalField.options,
            originalField.struct,
            0,
        );
        this.originalField = originalField;
        this.bufferField = arrayBufferField;
    }

    override getSize() {
        return this.originalField.getSize();
    }

    override get() {
        let value: string | number = this.bufferField.getSize();

        const originalValue = this.originalField.get();
        if (typeof originalValue === "string") {
            value = value.toString(
                this.bufferField.definition.options.lengthFieldRadix ?? 10,
            );
        }

        return value;
    }

    override set() {
        // Ignore setting
        // It will always be in sync with the buffer size
    }

    serialize(dataView: DataView, array: Uint8Array, offset: number) {
        this.originalField.set(this.get());
        this.originalField.serialize(dataView, array, offset);
    }
}
