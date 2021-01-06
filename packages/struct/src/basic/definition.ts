import type { StructOptions, StructSerializationContext } from './context';
import type { FieldRuntimeValue } from './runtime-value';

/**
 * A field definition is a bridge between its type and its runtime value.
 *
 * `Struct` record fields in a list of `FieldDefinition`s.
 *
 * When `Struct#create` or `Struct#deserialize` are called, each field's definition
 * crates its own type of `FieldRuntimeValue` to manage the field value in that `Struct` instance.
 *
 * One `FieldDefinition` can represents multiple similar types, just returns the corresponding
 * `FieldRuntimeValue` when `createValue` was called.
 *
 * @template TOptions TypeScript type of this definition's `options`.
 * @template TValueType TypeScript type of this field.
 * @template TRemoveFields Optional remove keys from current `Struct`. Should be a union of string literal types.
 */
export abstract class FieldDefinition<
    TOptions = void,
    TValueType = unknown,
    TRemoveFields = never,
    > {
    public readonly options: TOptions;

    /**
     * When `T` is a type initiated `FieldDefinition`,
     * use `T['valueType']` to retrieve its `TValueType` type parameter
     */
    public readonly valueType!: TValueType;

    /**
     * When `T` is a type initiated `FieldDefinition`,
     * use `T['removeFields']` to retrieve its `TRemoveFields` type parameter .
     */
    public readonly removeFields!: TRemoveFields;

    public constructor(options: TOptions) {
        this.options = options;
    }

    /**
     * When implemented in derived classes, returns the static size (or smallest size) of this field.
     *
     * Actual size can be retrieved from `FieldRuntimeValue#getSize`
     */
    public abstract getSize(): number;

    /**
     * When implemented in derived classes, creates a `FieldRuntimeValue` for the current field definition.
     */
    public abstract createValue(
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        object: any
    ): FieldRuntimeValue;
}
