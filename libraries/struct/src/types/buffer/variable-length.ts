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
    override getSize(): number {
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

    // eslint-disable-next-line @typescript-eslint/max-params
    constructor(
        definition: TDefinition,
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TDefinition["TValue"],
        array?: Uint8Array,
    ) {
        super(definition, options, struct, value, array);

        if (array) {
            this.length = array.length;
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

    #tryGetSize() {
        const length = this.definition.converter.getSize(this.value);
        if (length !== undefined && length < 0) {
            throw new Error("Invalid length");
        }
        return length;
    }

    override getSize(): number {
        if (this.length === undefined) {
            // first try to get the size from the converter
            this.length = this.#tryGetSize();
        }

        if (this.length === undefined) {
            // The converter doesn't know the size, so convert the value to a buffer to get its size
            this.array = this.definition.converter.toBuffer(this.value);
            this.length = this.array.length;
        }

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
    protected originalValue: StructFieldValue<
        StructFieldDefinition<unknown, unknown, PropertyKey>
    >;

    protected bufferValue: VariableLengthBufferLikeFieldValueLike;

    constructor(
        originalValue: StructFieldValue<
            StructFieldDefinition<unknown, unknown, PropertyKey>
        >,
        bufferValue: VariableLengthBufferLikeFieldValueLike,
    ) {
        super(
            originalValue.definition,
            originalValue.options,
            originalValue.struct,
            0,
        );
        this.originalValue = originalValue;
        this.bufferValue = bufferValue;
    }

    override getSize() {
        return this.originalValue.getSize();
    }

    override get() {
        let value: string | number = this.bufferValue.getSize();

        const originalValue = this.originalValue.get();
        if (typeof originalValue === "string") {
            value = value.toString(
                this.bufferValue.definition.options.lengthFieldRadix ?? 10,
            );
        }

        return value;
    }

    override set() {
        // Ignore setting
        // It will always be in sync with the buffer size
    }

    serialize(dataView: DataView, array: Uint8Array, offset: number) {
        this.originalValue.set(this.get());
        this.originalValue.serialize(dataView, array, offset);
    }
}
