/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
    AsyncExactReadable,
    ExactReadable,
    StructFieldDefinition,
    StructFieldValue,
    StructOptions,
} from "./basic/index.js";
import {
    ExactReadableEndedError,
    STRUCT_VALUE_SYMBOL,
    StructDefaultOptions,
    StructValue,
    isStructValueInit,
} from "./basic/index.js";
import { SyncPromise } from "./sync-promise.js";
import type {
    BufferFieldConverter,
    FixedLengthBufferLikeFieldOptions,
    LengthField,
    VariableLengthBufferLikeFieldOptions,
} from "./types/index.js";
import {
    BigIntFieldDefinition,
    BigIntFieldVariant,
    FixedLengthBufferLikeFieldDefinition,
    NumberFieldDefinition,
    NumberFieldVariant,
    StringBufferFieldConverter,
    Uint8ArrayBufferFieldConverter,
    VariableLengthBufferLikeFieldDefinition,
} from "./types/index.js";
import type { Evaluate, Identity, Overwrite, ValueOrPromise } from "./utils.js";

export interface StructLike<TValue> {
    deserialize(stream: ExactReadable | AsyncExactReadable): Promise<TValue>;
}

/**
 * Extract the value type of the specified `Struct`
 */
export type StructValueType<T extends StructLike<unknown>> = Awaited<
    ReturnType<T["deserialize"]>
>;

/**
 * Create a new `Struct` type with `TDefinition` appended
 */
type AddFieldDescriptor<
    TFields extends object,
    TOmitInitKey extends PropertyKey,
    TExtra extends object,
    TPostDeserialized,
    TFieldName extends PropertyKey,
    TDefinition extends StructFieldDefinition<unknown, unknown, PropertyKey>,
> = Identity<
    Struct<
        // Merge two types
        // Evaluate immediately to optimize editor hover tooltip
        Evaluate<TFields & Record<TFieldName, TDefinition["TValue"]>>,
        // Merge two `TOmitInitKey`s
        TOmitInitKey | TDefinition["TOmitInitKey"],
        TExtra,
        TPostDeserialized
    >
>;

/**
 * Overload methods to add an array buffer like field
 */
interface ArrayBufferLikeFieldCreator<
    TFields extends object,
    TOmitInitKey extends PropertyKey,
    TExtra extends object,
    TPostDeserialized,
> {
    /**
     * Append a fixed-length array buffer like field to the `Struct`
     *
     * @param name Name of the field
     * @param type `Array.SubType.ArrayBuffer` or `Array.SubType.String`
     * @param options Fixed-length array options
     * @param typeScriptType Type of the field in TypeScript.
     * For example, if this field is a string, you can declare it as a string enum or literal union.
     */
    <
        TName extends PropertyKey,
        TType extends BufferFieldConverter<unknown, unknown>,
        TTypeScriptType = TType["TTypeScriptType"],
    >(
        name: TName,
        type: TType,
        options: FixedLengthBufferLikeFieldOptions,
        typeScriptType?: TTypeScriptType,
    ): AddFieldDescriptor<
        TFields,
        TOmitInitKey,
        TExtra,
        TPostDeserialized,
        TName,
        FixedLengthBufferLikeFieldDefinition<
            TType,
            FixedLengthBufferLikeFieldOptions
        >
    >;

    /**
     * Append a variable-length array buffer like field to the `Struct`
     */
    <
        TName extends PropertyKey,
        TType extends BufferFieldConverter<unknown, unknown>,
        TOptions extends VariableLengthBufferLikeFieldOptions<TFields>,
        TTypeScriptType = TType["TTypeScriptType"],
    >(
        name: TName,
        type: TType,
        options: TOptions,
        typeScriptType?: TTypeScriptType,
    ): AddFieldDescriptor<
        TFields,
        TOmitInitKey,
        TExtra,
        TPostDeserialized,
        TName,
        VariableLengthBufferLikeFieldDefinition<TType, TOptions>
    >;
}

/**
 * Similar to `ArrayBufferLikeFieldCreator`, but bind to `TType`
 */
interface BoundArrayBufferLikeFieldDefinitionCreator<
    TFields extends object,
    TOmitInitKey extends PropertyKey,
    TExtra extends object,
    TPostDeserialized,
    TType extends BufferFieldConverter<unknown, unknown>,
> {
    <TName extends PropertyKey, TTypeScriptType = TType["TTypeScriptType"]>(
        name: TName,
        options: FixedLengthBufferLikeFieldOptions,
        typeScriptType?: TTypeScriptType,
    ): AddFieldDescriptor<
        TFields,
        TOmitInitKey,
        TExtra,
        TPostDeserialized,
        TName,
        FixedLengthBufferLikeFieldDefinition<
            TType,
            FixedLengthBufferLikeFieldOptions,
            TTypeScriptType
        >
    >;

    <
        TName extends PropertyKey,
        TOptions extends VariableLengthBufferLikeFieldOptions<
            TFields,
            LengthField<TFields>
        >,
        TTypeScriptType = TType["TTypeScriptType"],
    >(
        name: TName,
        options: TOptions,
        typeScriptType?: TTypeScriptType,
    ): AddFieldDescriptor<
        TFields,
        TOmitInitKey,
        TExtra,
        TPostDeserialized,
        TName,
        VariableLengthBufferLikeFieldDefinition<
            TType,
            TOptions,
            TTypeScriptType
        >
    >;
}

export type StructPostDeserialized<TFields, TPostDeserialized> = (
    this: TFields,
    object: TFields,
) => TPostDeserialized;

export type StructDeserializedResult<
    TFields extends object,
    TExtra extends object,
    TPostDeserialized,
> = TPostDeserialized extends undefined
    ? Overwrite<TExtra, TFields>
    : TPostDeserialized;

export class StructDeserializeError extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class StructNotEnoughDataError extends StructDeserializeError {
    constructor() {
        super(
            "The underlying readable was ended before the struct was fully deserialized",
        );
    }
}

export class StructEmptyError extends StructDeserializeError {
    constructor() {
        super("The underlying readable doesn't contain any more struct");
    }
}

interface StructDefinition<
    TFields extends object,
    TOmitInitKey extends PropertyKey,
    TExtra extends object,
> {
    readonly TFields: TFields;

    readonly TOmitInitKey: TOmitInitKey;

    readonly TExtra: TExtra;

    readonly TInit: Evaluate<Omit<TFields, TOmitInitKey>>;
}

export class Struct<
    TFields extends object = Record<never, never>,
    TOmitInitKey extends PropertyKey = never,
    TExtra extends object = Record<never, never>,
    TPostDeserialized = undefined,
> implements
        StructLike<
            StructDeserializedResult<TFields, TExtra, TPostDeserialized>
        >
{
    readonly TFields!: TFields;

    readonly TOmitInitKey!: TOmitInitKey;

    readonly TExtra!: TExtra;

    readonly TInit!: Evaluate<Omit<TFields, TOmitInitKey>>;

    readonly TDeserializeResult!: StructDeserializedResult<
        TFields,
        TExtra,
        TPostDeserialized
    >;

    readonly options: Readonly<StructOptions>;

    #size = 0;
    /**
     * Gets the static size (exclude fields that can change size at runtime)
     */
    get size() {
        return this.#size;
    }

    #fields: [
        name: PropertyKey,
        definition: StructFieldDefinition<unknown, unknown, PropertyKey>,
    ][] = [];
    get fields(): readonly [
        name: PropertyKey,
        definition: StructFieldDefinition<unknown, unknown, PropertyKey>,
    ][] {
        return this.#fields;
    }

    #extra: Record<PropertyKey, unknown> = {};

    #postDeserialized?: StructPostDeserialized<never, unknown> | undefined;

    constructor(options?: Partial<Readonly<StructOptions>>) {
        this.options = { ...StructDefaultOptions, ...options };
    }

    /**
     * Appends a `StructFieldDefinition` to the `Struct
     */
    field<
        TName extends PropertyKey,
        TDefinition extends StructFieldDefinition<
            unknown,
            unknown,
            PropertyKey
        >,
    >(
        name: TName,
        definition: TDefinition,
    ): AddFieldDescriptor<
        TFields,
        TOmitInitKey,
        TExtra,
        TPostDeserialized,
        TName,
        TDefinition
    > {
        for (const field of this.#fields) {
            if (field[0] === name) {
                // Convert Symbol to string
                const nameString = String(name);
                throw new Error(
                    `This struct already have a field with name '${nameString}'`,
                );
            }
        }

        this.#fields.push([name, definition]);

        const size = definition.getSize();
        this.#size += size;

        // Force cast `this` to another type
        return this as never;
    }

    /**
     * Merges (flats) another `Struct`'s fields and extra fields into this one.
     *
     * `other`'s `postDeserialize` will be ignored.
     */
    concat<TOther extends StructDefinition<object, PropertyKey, object>>(
        other: TOther,
    ): Struct<
        TFields & TOther["TFields"],
        TOmitInitKey | TOther["TOmitInitKey"],
        TExtra & TOther["TExtra"],
        TPostDeserialized
    > {
        if (!(other instanceof Struct)) {
            throw new TypeError("The other value must be a `Struct` instance");
        }

        for (const field of other.#fields) {
            this.#fields.push(field);
        }
        this.#size += other.#size;
        Object.defineProperties(
            this.#extra,
            Object.getOwnPropertyDescriptors(other.#extra),
        );
        return this as never;
    }

    #number<
        TName extends PropertyKey,
        TType extends NumberFieldVariant = NumberFieldVariant,
        TTypeScriptType = number,
    >(name: TName, type: TType, typeScriptType?: TTypeScriptType) {
        return this.field(
            name,
            new NumberFieldDefinition(type, typeScriptType),
        );
    }

    /**
     * Appends an `int8` field to the `Struct`
     */
    int8<TName extends PropertyKey, TTypeScriptType = number>(
        name: TName,
        typeScriptType?: TTypeScriptType,
    ) {
        return this.#number(name, NumberFieldVariant.Int8, typeScriptType);
    }

    /**
     * Appends an `uint8` field to the `Struct`
     */
    uint8<TName extends PropertyKey, TTypeScriptType = number>(
        name: TName,
        typeScriptType?: TTypeScriptType,
    ) {
        return this.#number(name, NumberFieldVariant.Uint8, typeScriptType);
    }

    /**
     * Appends an `int16` field to the `Struct`
     */
    int16<TName extends PropertyKey, TTypeScriptType = number>(
        name: TName,
        typeScriptType?: TTypeScriptType,
    ) {
        return this.#number(name, NumberFieldVariant.Int16, typeScriptType);
    }

    /**
     * Appends an `uint16` field to the `Struct`
     */
    uint16<TName extends PropertyKey, TTypeScriptType = number>(
        name: TName,
        typeScriptType?: TTypeScriptType,
    ) {
        return this.#number(name, NumberFieldVariant.Uint16, typeScriptType);
    }

    /**
     * Appends an `int32` field to the `Struct`
     */
    int32<TName extends PropertyKey, TTypeScriptType = number>(
        name: TName,
        typeScriptType?: TTypeScriptType,
    ) {
        return this.#number(name, NumberFieldVariant.Int32, typeScriptType);
    }

    /**
     * Appends an `uint32` field to the `Struct`
     */
    uint32<TName extends PropertyKey, TTypeScriptType = number>(
        name: TName,
        typeScriptType?: TTypeScriptType,
    ) {
        return this.#number(name, NumberFieldVariant.Uint32, typeScriptType);
    }

    #bigint<
        TName extends PropertyKey,
        TType extends BigIntFieldVariant = BigIntFieldVariant,
        TTypeScriptType = TType["TTypeScriptType"],
    >(name: TName, type: TType, typeScriptType?: TTypeScriptType) {
        return this.field(
            name,
            new BigIntFieldDefinition(type, typeScriptType),
        );
    }

    /**
     * Appends an `int64` field to the `Struct`
     *
     * Requires native `BigInt` support
     */
    int64<
        TName extends PropertyKey,
        TTypeScriptType = BigIntFieldVariant["TTypeScriptType"],
    >(name: TName, typeScriptType?: TTypeScriptType) {
        return this.#bigint(name, BigIntFieldVariant.Int64, typeScriptType);
    }

    /**
     * Appends an `uint64` field to the `Struct`
     *
     * Requires native `BigInt` support
     */
    uint64<
        TName extends PropertyKey,
        TTypeScriptType = BigIntFieldVariant["TTypeScriptType"],
    >(name: TName, typeScriptType?: TTypeScriptType) {
        return this.#bigint(name, BigIntFieldVariant.Uint64, typeScriptType);
    }

    #arrayBufferLike: ArrayBufferLikeFieldCreator<
        TFields,
        TOmitInitKey,
        TExtra,
        TPostDeserialized
    > = (
        name: PropertyKey,
        type: BufferFieldConverter,
        options:
            | FixedLengthBufferLikeFieldOptions
            | VariableLengthBufferLikeFieldOptions,
    ): never => {
        if ("length" in options) {
            return this.field(
                name,
                new FixedLengthBufferLikeFieldDefinition(type, options),
            ) as never;
        } else {
            return this.field(
                name,
                new VariableLengthBufferLikeFieldDefinition(type, options),
            ) as never;
        }
    };

    uint8Array: BoundArrayBufferLikeFieldDefinitionCreator<
        TFields,
        TOmitInitKey,
        TExtra,
        TPostDeserialized,
        Uint8ArrayBufferFieldConverter
    > = (
        name: PropertyKey,
        options: unknown,
        typeScriptType: unknown,
    ): never => {
        return this.#arrayBufferLike(
            name,
            Uint8ArrayBufferFieldConverter.Instance,
            options as never,
            typeScriptType,
        ) as never;
    };

    string: BoundArrayBufferLikeFieldDefinitionCreator<
        TFields,
        TOmitInitKey,
        TExtra,
        TPostDeserialized,
        StringBufferFieldConverter
    > = (
        name: PropertyKey,
        options: unknown,
        typeScriptType: unknown,
    ): never => {
        return this.#arrayBufferLike(
            name,
            StringBufferFieldConverter.Instance,
            options as never,
            typeScriptType,
        ) as never;
    };

    /**
     * Adds some extra properties into every `Struct` value.
     *
     * Extra properties will not affect serialize or deserialize process.
     *
     * Multiple calls to `extra` will merge all properties together.
     *
     * @param value
     * An object containing properties to be added to the result value. Accessors and methods are also allowed.
     */
    extra<
        T extends Record<
            // This trick disallows any keys that are already in `TValue`
            Exclude<keyof T, Exclude<keyof T, keyof TFields>>,
            never
        >,
    >(
        value: T & ThisType<Overwrite<Overwrite<TExtra, T>, TFields>>,
    ): Struct<TFields, TOmitInitKey, Overwrite<TExtra, T>, TPostDeserialized> {
        Object.defineProperties(
            this.#extra,
            Object.getOwnPropertyDescriptors(value),
        );
        return this as never;
    }

    /**
     * Registers (or replaces) a custom callback to be run after deserialized.
     *
     * A callback returning `never` (always throw an error)
     * will also change the return type of `deserialize` to `never`.
     */
    postDeserialize(
        callback: StructPostDeserialized<TFields, never>,
    ): Struct<TFields, TOmitInitKey, TExtra, never>;
    /**
     * Registers (or replaces) a custom callback to be run after deserialized.
     *
     * A callback returning `void` means it modify the result object in-place
     * (or doesn't modify it at all), so `deserialize` will still return the result object.
     */
    postDeserialize(
        callback?: StructPostDeserialized<TFields, void>,
    ): Struct<TFields, TOmitInitKey, TExtra, undefined>;
    /**
     * Registers (or replaces) a custom callback to be run after deserialized.
     *
     * A callback returning anything other than `undefined`
     * will `deserialize` to return that object instead.
     */
    postDeserialize<TPostSerialize>(
        callback?: StructPostDeserialized<TFields, TPostSerialize>,
    ): Struct<TFields, TOmitInitKey, TExtra, TPostSerialize>;
    postDeserialize(callback?: StructPostDeserialized<TFields, unknown>) {
        this.#postDeserialized = callback;
        return this as never;
    }

    /**
     * Deserialize a struct value from `stream`.
     */
    deserialize(
        stream: ExactReadable,
    ): StructDeserializedResult<TFields, TExtra, TPostDeserialized>;
    deserialize(
        stream: AsyncExactReadable,
    ): Promise<StructDeserializedResult<TFields, TExtra, TPostDeserialized>>;
    deserialize(
        stream: ExactReadable | AsyncExactReadable,
    ): ValueOrPromise<
        StructDeserializedResult<TFields, TExtra, TPostDeserialized>
    > {
        const structValue = new StructValue(this.#extra);

        let promise = SyncPromise.resolve();

        const startPosition = stream.position;
        for (const [name, definition] of this.#fields) {
            promise = promise
                .then(() =>
                    definition.deserialize(this.options, stream, structValue),
                )
                .then(
                    (fieldValue) => {
                        structValue.set(name, fieldValue);
                    },
                    (e) => {
                        if (!(e instanceof ExactReadableEndedError)) {
                            throw e;
                        }

                        if (stream.position === startPosition) {
                            throw new StructEmptyError();
                        } else {
                            throw new StructNotEnoughDataError();
                        }
                    },
                );
        }

        return promise
            .then(() => {
                const value = structValue.value;

                // Run `postDeserialized`
                if (this.#postDeserialized) {
                    const override = this.#postDeserialized.call(
                        value as never,
                        value as never,
                    );
                    // If it returns a new value, use that as result
                    // Otherwise it only inspects/mutates the object in place.
                    if (override !== undefined) {
                        return override as never;
                    }
                }

                return value as never;
            })
            .valueOrPromise();
    }

    /**
     * Serialize a struct value to a buffer.
     * @param init Fields of the struct
     * @param output The buffer to serialize the struct to. It must be large enough to hold the entire struct. If not provided, a new buffer will be created.
     * @returns A view of `output` that contains the serialized struct, or a new buffer if `output` is not provided.
     */
    serialize(
        init: Evaluate<Omit<TFields, TOmitInitKey>>,
        output?: Uint8Array,
    ): Uint8Array {
        let structValue: StructValue;
        if (isStructValueInit(init)) {
            structValue = init[STRUCT_VALUE_SYMBOL];
            for (const [key, value] of Object.entries(init)) {
                const fieldValue = structValue.get(key);
                if (fieldValue) {
                    fieldValue.set(value);
                }
            }
        } else {
            structValue = new StructValue({});
            for (const [name, definition] of this.#fields) {
                const fieldValue = definition.create(
                    this.options,
                    structValue,
                    (init as Record<PropertyKey, unknown>)[name],
                );
                structValue.set(name, fieldValue);
            }
        }

        let structSize = 0;
        const fieldsInfo: {
            fieldValue: StructFieldValue<any>;
            size: number;
        }[] = [];

        for (const [name] of this.#fields) {
            const fieldValue = structValue.get(name);
            const size = fieldValue.getSize();
            fieldsInfo.push({ fieldValue, size });
            structSize += size;
        }

        if (!output) {
            output = new Uint8Array(structSize);
        } else if (output.length < structSize) {
            throw new TypeError("Output buffer is too small");
        }

        let offset = 0;
        for (const { fieldValue, size } of fieldsInfo) {
            fieldValue.serialize(output, offset);
            offset += size;
        }

        if (output.length !== structSize) {
            return output.subarray(0, structSize);
        } else {
            return output;
        }
    }
}
