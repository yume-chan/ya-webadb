import type { ValueOrPromise } from '../utils';
import type { StructDeserializationContext, StructOptions, StructSerializationContext } from './context';
import type { StructFieldValue } from './field-value';
import type { StructValue } from './struct-value';

/**
 * A field definition is a bridge between its type and its runtime value.
 *
 * `Struct` record fields in a list of `StructFieldDefinition`s.
 *
 * When `Struct#create` or `Struct#deserialize` are called, each field's definition
 * crates its own type of `StructFieldValue` to manage the field value in that `Struct` instance.
 *
 * One `StructFieldDefinition` can represents multiple similar types, just returns the corresponding
 * `StructFieldValue` when `createValue` was called.
 *
 * @template TOptions TypeScript type of this definition's `options`.
 * @template TValue TypeScript type of this field.
 * @template TOmitInitKey Optionally remove some fields from the init type. Should be a union of string literal types.
 */
export abstract class StructFieldDefinition<
    TOptions = void,
    TValue = unknown,
    TOmitInitKey extends PropertyKey = never,
    > {
    /**
     * When `T` is a type initiated `StructFieldDefinition`,
     * use `T['TValue']` to retrieve its `TValue` type parameter.
     */
    public readonly TValue!: TValue;

    /**
     * When `T` is a type initiated `StructFieldDefinition`,
     * use `T['TOmitInitKey']` to retrieve its `TOmitInitKey` type parameter.
     */
    public readonly TOmitInitKey!: TOmitInitKey;

    public readonly options: TOptions;

    public constructor(options: TOptions) {
        this.options = options;
    }

    /**
     * When implemented in derived classes, returns the size (or minimal size if it's dynamic) of this field.
     *
     * Actual size can be retrieved from `StructFieldValue#getSize`
     */
    public abstract getSize(): number;

    /**
     * When implemented in derived classes, creates a `StructFieldValue` from a given `value`.
     */
    public abstract create(
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        struct: StructValue,
        value: TValue,
    ): StructFieldValue<this>;

    /**
     * When implemented in derived classes, creates a `StructFieldValue` by parsing `context`.
     */
    public abstract deserialize(
        options: Readonly<StructOptions>,
        context: StructDeserializationContext,
        struct: StructValue,
    ): ValueOrPromise<StructFieldValue<this>>;
}
