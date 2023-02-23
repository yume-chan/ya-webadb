import type { StructFieldValue } from "./field-value.js";
import type { StructOptions } from "./options.js";
import type {
    StructAsyncDeserializeStream,
    StructDeserializeStream,
} from "./stream.js";
import type { StructValue } from "./struct-value.js";

/**
 * A field definition defines how to deserialize a field.
 *
 * @template TOptions TypeScript type of this definition's `options`.
 * @template TValue TypeScript type of this field.
 * @template TOmitInitKey Optionally remove some fields from the init type. Should be a union of string literal types.
 */
export abstract class StructFieldDefinition<
    TOptions = void,
    TValue = unknown,
    TOmitInitKey extends PropertyKey = never
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
        structValue: StructValue,
        value: TValue
    ): StructFieldValue<this>;

    /**
     * When implemented in derived classes,It must be synchronous (returns a value) or asynchronous (returns a `Promise`) depending
     * on the type of `stream`. reads and creates a `StructFieldValue` from `stream`.
     *
     *  `SyncPromise` can be used to simplify implementation.
     */
    public abstract deserialize(
        options: Readonly<StructOptions>,
        stream: StructDeserializeStream,
        structValue: StructValue
    ): StructFieldValue<this>;
    public abstract deserialize(
        options: Readonly<StructOptions>,
        stream: StructAsyncDeserializeStream,
        struct: StructValue
    ): Promise<StructFieldValue<this>>;
}
