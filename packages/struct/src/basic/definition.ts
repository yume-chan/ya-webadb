import type { StructDeserializationContext, StructOptions, StructSerializationContext } from './context';
import type { FieldRuntimeValue } from './runtime-value';

type ValueOrPromise<T> = T | Promise<T>;

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
 * @template TOmitInit Optionally remove some fields from the init type. Should be a union of string literal types.
 */
export abstract class FieldDefinition<
    TOptions = void,
    TValueType = unknown,
    TOmitInit = never,
    > {
    public readonly options: TOptions;

    /**
     * When `T` is a type initiated `FieldDefinition`,
     * use `T['valueType']` to retrieve its `TValueType` type parameter.
     */
    public readonly valueType!: TValueType;

    /**
     * When `T` is a type initiated `FieldDefinition`,
     * use `T['omitInitType']` to retrieve its `TOmitInit` type parameter.
     */
    public readonly omitInitType!: TOmitInit;

    public constructor(options: TOptions) {
        this.options = options;
    }

    /**
     * When implemented in derived classes, returns the size (or minimal size if it's dynamic) of this field.
     *
     * Actual size can be retrieved from `FieldRuntimeValue#getSize`
     */
    public abstract getSize(): number;

    /**
     * When implemented in derived classes, creates a `FieldRuntimeValue` by parsing the `context`.
     */
    public abstract deserialize(
        options: Readonly<StructOptions>,
        context: StructDeserializationContext,
        object: any,
    ): ValueOrPromise<FieldRuntimeValue<FieldDefinition<TOptions, TValueType, TOmitInit>>>;

    /**
     * When implemented in derived classes, creates a `FieldRuntimeValue` from a given `value`.
     */
    public abstract createValue(
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        object: any,
        value: TValueType,
    ): FieldRuntimeValue<FieldDefinition<TOptions, TValueType, TOmitInit>>;
}
