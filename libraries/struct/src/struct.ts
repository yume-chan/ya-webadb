import type { StructAsyncDeserializeStream, StructDeserializeStream, StructFieldDefinition, StructFieldValue, StructOptions } from './basic';
import { StructDefaultOptions, StructValue } from './basic';
import { Syncbird } from "./syncbird";
import { ArrayBufferFieldType, ArrayBufferLikeFieldType, BigIntFieldDefinition, BigIntFieldType, FixedLengthArrayBufferLikeFieldDefinition, FixedLengthArrayBufferLikeFieldOptions, LengthField, NumberFieldDefinition, NumberFieldType, StringFieldType, Uint8ClampedArrayFieldType, VariableLengthArrayBufferLikeFieldDefinition, VariableLengthArrayBufferLikeFieldOptions } from './types';
import { Evaluate, Identity, Overwrite, ValueOrPromise } from "./utils";

export interface StructLike<TValue> {
    deserialize(stream: StructDeserializeStream | StructAsyncDeserializeStream): Promise<TValue>;
}

/**
 * Extract the value type of the specified `Struct`
 */
export type StructValueType<T extends StructLike<any>> =
    Awaited<ReturnType<T['deserialize']>>;

/**
 * Create a new `Struct` type with `TDefinition` appended
 */
type AddFieldDescriptor<
    TFields extends object,
    TOmitInitKey extends PropertyKey,
    TExtra extends object,
    TPostDeserialized,
    TFieldName extends PropertyKey,
    TDefinition extends StructFieldDefinition<any, any, any>
    > =
    Identity<Struct<
        // Merge two types
        // Evaluate immediately to optimize editor hover tooltip
        Evaluate<TFields & Record<TFieldName, TDefinition['TValue']>>,
        // Merge two `TOmitInitKey`s
        TOmitInitKey | TDefinition['TOmitInitKey'],
        TExtra,
        TPostDeserialized
    >>;

/**
 * Overload methods to add an array buffer like field
 */
interface ArrayBufferLikeFieldCreator<
    TFields extends object,
    TOmitInitKey extends PropertyKey,
    TExtra extends object,
    TPostDeserialized
    > {
    /**
     * Append a fixed-length array buffer like field to the `Struct`
     *
     * @param name Name of the field
     * @param type `Array.SubType.ArrayBuffer` or `Array.SubType.String`
     * @param options Fixed-length array options
     * @param typescriptType Type of the field in TypeScript.
     * For example, if this field is a string, you can declare it as a string enum or literal union.
     */
    <
        TName extends PropertyKey,
        TType extends ArrayBufferLikeFieldType<any, any>,
        TTypeScriptType = TType['TTypeScriptType'],
        >(
        name: TName,
        type: TType,
        options: FixedLengthArrayBufferLikeFieldOptions,
        typescriptType?: TTypeScriptType,
    ): AddFieldDescriptor<
        TFields,
        TOmitInitKey,
        TExtra,
        TPostDeserialized,
        TName,
        FixedLengthArrayBufferLikeFieldDefinition<
            TType,
            FixedLengthArrayBufferLikeFieldOptions
        >
    >;

    /**
     * Append a variable-length array buffer like field to the `Struct`
     */
    <
        TName extends PropertyKey,
        TType extends ArrayBufferLikeFieldType<any, any>,
        TOptions extends VariableLengthArrayBufferLikeFieldOptions<TFields>,
        TTypeScriptType = TType['TTypeScriptType'],
        >(
        name: TName,
        type: TType,
        options: TOptions,
        typescriptType?: TTypeScriptType,
    ): AddFieldDescriptor<
        TFields,
        TOmitInitKey,
        TExtra,
        TPostDeserialized,
        TName,
        VariableLengthArrayBufferLikeFieldDefinition<
            TType,
            TOptions
        >
    >;
}

/**
 * Similar to `ArrayBufferLikeFieldCreator`, but bind to `TType`
 */
interface BindedArrayBufferLikeFieldDefinitionCreator<
    TFields extends object,
    TOmitInitKey extends PropertyKey,
    TExtra extends object,
    TPostDeserialized,
    TType extends ArrayBufferLikeFieldType<any, any>
    > {
    <
        TName extends PropertyKey,
        TTypeScriptType = TType['TTypeScriptType'],
        >(
        name: TName,
        options: FixedLengthArrayBufferLikeFieldOptions,
        typescriptType?: TTypeScriptType,
    ): AddFieldDescriptor<
        TFields,
        TOmitInitKey,
        TExtra,
        TPostDeserialized,
        TName,
        FixedLengthArrayBufferLikeFieldDefinition<
            TType,
            FixedLengthArrayBufferLikeFieldOptions
        >
    >;

    <
        TName extends PropertyKey,
        TLengthField extends LengthField<TFields>,
        TOptions extends VariableLengthArrayBufferLikeFieldOptions<TFields, TLengthField>,
        TTypeScriptType = TType['TTypeScriptType'],
        >(
        name: TName,
        options: TOptions,
        typescriptType?: TTypeScriptType,
    ): AddFieldDescriptor<
        TFields,
        TOmitInitKey,
        TExtra,
        TPostDeserialized,
        TName,
        VariableLengthArrayBufferLikeFieldDefinition<
            TType,
            TOptions
        >
    >;
}

export type StructPostDeserialized<TFields, TPostDeserialized> =
    (this: TFields, object: TFields) => TPostDeserialized;

export type StructDeserializedResult<TFields extends object, TExtra extends object, TPostDeserialized> =
    TPostDeserialized extends undefined ? Overwrite<TExtra, TFields> : TPostDeserialized;

export class Struct<
    TFields extends object = {},
    TOmitInitKey extends PropertyKey = never,
    TExtra extends object = {},
    TPostDeserialized = undefined,
    > implements StructLike<StructDeserializedResult<TFields, TExtra, TPostDeserialized>>{
    public readonly TFields!: TFields;

    public readonly TOmitInitKey!: TOmitInitKey;

    public readonly TExtra!: TExtra;

    public readonly TInit!: Evaluate<Omit<TFields, TOmitInitKey>>;

    public readonly TDeserializeResult!: StructDeserializedResult<TFields, TExtra, TPostDeserialized>;

    public readonly options: Readonly<StructOptions>;

    private _size = 0;
    /**
     * Gets the static size (exclude fields that can change size at runtime)
     */
    public get size() { return this._size; }

    private _fields: [name: PropertyKey, definition: StructFieldDefinition<any, any, any>][] = [];

    private _extra: PropertyDescriptorMap = {};

    private _postDeserialized?: StructPostDeserialized<any, any> | undefined;

    public constructor(options?: Partial<Readonly<StructOptions>>) {
        this.options = { ...StructDefaultOptions, ...options };
    }

    /**
     * Appends a `StructFieldDefinition` to the `Struct
     */
    public field<
        TName extends PropertyKey,
        TDefinition extends StructFieldDefinition<any, any, any>
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
        for (const field of this._fields) {
            if (field[0] === name) {
                throw new Error(`This struct already have a field with name '${name}'`);
            }
        }

        this._fields.push([name, definition]);

        const size = definition.getSize();
        this._size += size;

        // Force cast `this` to another type
        return this as any;
    }

    /**
     * Merges (flats) another `Struct`'s fields and extra fields into this one.
     */
    public fields<TOther extends Struct<any, any, any, any>>(
        other: TOther
    ): Struct<
        TFields & TOther['TFields'],
        TOmitInitKey | TOther['TOmitInitKey'],
        TExtra & TOther['TExtra'],
        TPostDeserialized
    > {
        for (const field of other._fields) {
            this._fields.push(field);
        }
        this._size += other._size;
        Object.assign(this._extra, other._extra);
        return this as any;
    }

    private number<
        TName extends PropertyKey,
        TType extends NumberFieldType = NumberFieldType,
        TTypeScriptType = TType['TTypeScriptType']
    >(
        name: TName,
        type: TType,
        _typescriptType?: TTypeScriptType,
    ) {
        return this.field(
            name,
            new NumberFieldDefinition(type, _typescriptType),
        );
    }

    /**
     * Appends an `int8` field to the `Struct`
     */
    public int8<
        TName extends PropertyKey,
        TTypeScriptType = (typeof NumberFieldType)['Uint8']['TTypeScriptType']
    >(
        name: TName,
        _typescriptType?: TTypeScriptType,
    ) {
        return this.number(
            name,
            NumberFieldType.Int8,
            _typescriptType
        );
    }

    /**
     * Appends an `uint8` field to the `Struct`
     */
    public uint8<
        TName extends PropertyKey,
        TTypeScriptType = (typeof NumberFieldType)['Uint8']['TTypeScriptType']
    >(
        name: TName,
        _typescriptType?: TTypeScriptType,
    ) {
        return this.number(
            name,
            NumberFieldType.Uint8,
            _typescriptType
        );
    }

    /**
     * Appends an `int16` field to the `Struct`
     */
    public int16<
        TName extends PropertyKey,
        TTypeScriptType = (typeof NumberFieldType)['Uint16']['TTypeScriptType']
    >(
        name: TName,
        _typescriptType?: TTypeScriptType,
    ) {
        return this.number(
            name,
            NumberFieldType.Int16,
            _typescriptType
        );
    }

    /**
     * Appends an `uint16` field to the `Struct`
     */
    public uint16<
        TName extends PropertyKey,
        TTypeScriptType = (typeof NumberFieldType)['Uint16']['TTypeScriptType']
    >(
        name: TName,
        _typescriptType?: TTypeScriptType,
    ) {
        return this.number(
            name,
            NumberFieldType.Uint16,
            _typescriptType
        );
    }

    /**
     * Appends an `int32` field to the `Struct`
     */
    public int32<
        TName extends PropertyKey,
        TTypeScriptType = (typeof NumberFieldType)['Int32']['TTypeScriptType']
    >(
        name: TName,
        _typescriptType?: TTypeScriptType,
    ) {
        return this.number(
            name,
            NumberFieldType.Int32,
            _typescriptType
        );
    }

    /**
     * Appends an `uint32` field to the `Struct`
     */
    public uint32<
        TName extends PropertyKey,
        TTypeScriptType = (typeof NumberFieldType)['Uint32']['TTypeScriptType']
    >(
        name: TName,
        typescriptType?: TTypeScriptType,
    ) {
        return this.number(
            name,
            NumberFieldType.Uint32,
            typescriptType
        );
    }

    private bigint<
        TName extends PropertyKey,
        TType extends BigIntFieldType = BigIntFieldType,
        TTypeScriptType = TType['TTypeScriptType']
    >(
        name: TName,
        type: TType,
        _typescriptType?: TTypeScriptType,
    ) {
        return this.field(
            name,
            new BigIntFieldDefinition(type, _typescriptType),
        );
    }

    /**
     * Appends an `int64` field to the `Struct`
     *
     * Requires native `BigInt` support
     */
    public int64<
        TName extends PropertyKey,
        TTypeScriptType = BigIntFieldType['TTypeScriptType']
    >(
        name: TName,
        _typescriptType?: TTypeScriptType,
    ) {
        return this.bigint(
            name,
            BigIntFieldType.Int64,
            _typescriptType
        );
    }

    /**
     * Appends an `uint64` field to the `Struct`
     *
     * Requires native `BigInt` support
     */
    public uint64<
        TName extends PropertyKey,
        TTypeScriptType = BigIntFieldType['TTypeScriptType']
    >(
        name: TName,
        _typescriptType?: TTypeScriptType,
    ) {
        return this.bigint(
            name,
            BigIntFieldType.Int64,
            _typescriptType
        );
    }

    private arrayBufferLike: ArrayBufferLikeFieldCreator<
        TFields,
        TOmitInitKey,
        TExtra,
        TPostDeserialized
    > = (
        name: PropertyKey,
        type: ArrayBufferLikeFieldType,
        options: FixedLengthArrayBufferLikeFieldOptions | VariableLengthArrayBufferLikeFieldOptions
    ): any => {
            if ('length' in options) {
                return this.field(
                    name,
                    new FixedLengthArrayBufferLikeFieldDefinition(type, options),
                );
            } else {
                return this.field(
                    name,
                    new VariableLengthArrayBufferLikeFieldDefinition(type, options),
                );
            }
        };

    public arrayBuffer: BindedArrayBufferLikeFieldDefinitionCreator<
        TFields,
        TOmitInitKey,
        TExtra,
        TPostDeserialized,
        ArrayBufferFieldType
    > = (
        name: PropertyKey,
        options: any
    ): any => {
            return this.arrayBufferLike(name, ArrayBufferFieldType.instance, options);
        };

    public uint8ClampedArray: BindedArrayBufferLikeFieldDefinitionCreator<
        TFields,
        TOmitInitKey,
        TExtra,
        TPostDeserialized,
        Uint8ClampedArrayFieldType
    > = (
        name: PropertyKey,
        options: any
    ): any => {
            return this.arrayBufferLike(name, Uint8ClampedArrayFieldType.instance, options);
        };

    public string: BindedArrayBufferLikeFieldDefinitionCreator<
        TFields,
        TOmitInitKey,
        TExtra,
        TPostDeserialized,
        StringFieldType
    > = (
        name: PropertyKey,
        options: any
    ): any => {
            return this.arrayBufferLike(name, StringFieldType.instance, options);
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
    public extra<T extends Record<
        // This trick disallows any keys that are already in `TValue`
        Exclude<
            keyof T,
            Exclude<keyof T, keyof TFields>
        >,
        never
    >>(
        value: T & ThisType<Overwrite<Overwrite<TExtra, T>, TFields>>
    ): Struct<
        TFields,
        TOmitInitKey,
        Overwrite<TExtra, T>,
        TPostDeserialized
    > {
        Object.assign(this._extra, Object.getOwnPropertyDescriptors(value));
        return this as any;
    }

    /**
     * Registers (or replaces) a custom callback to be run after deserialized.
     *
     * A callback returning `never` (always throw an error)
     * will also change the return type of `deserialize` to `never`.
     */
    public postDeserialize(
        callback: StructPostDeserialized<TFields, never>
    ): Struct<TFields, TOmitInitKey, TExtra, never>;
    /**
     * Registers (or replaces) a custom callback to be run after deserialized.
     *
     * A callback returning `void` means it modify the result object in-place
     * (or doesn't modify it at all), so `deserialize` will still return the result object.
     */
    public postDeserialize(
        callback?: StructPostDeserialized<TFields, void>
    ): Struct<TFields, TOmitInitKey, TExtra, undefined>;
    /**
     * Registers (or replaces) a custom callback to be run after deserialized.
     *
     * A callback returning anything other than `undefined`
     * will `deserialize` to return that object instead.
     */
    public postDeserialize<TPostSerialize>(
        callback?: StructPostDeserialized<TFields, TPostSerialize>
    ): Struct<TFields, TOmitInitKey, TExtra, TPostSerialize>;
    public postDeserialize(
        callback?: StructPostDeserialized<TFields, any>
    ) {
        this._postDeserialized = callback;
        return this as any;
    }

    public deserialize(
        stream: StructDeserializeStream,
    ): StructDeserializedResult<TFields, TExtra, TPostDeserialized>;
    public deserialize(
        stream: StructAsyncDeserializeStream,
    ): Promise<StructDeserializedResult<TFields, TExtra, TPostDeserialized>>;
    public deserialize(
        stream: StructDeserializeStream | StructAsyncDeserializeStream,
    ): ValueOrPromise<StructDeserializedResult<TFields, TExtra, TPostDeserialized>> {
        const value = new StructValue();
        Object.defineProperties(value.value, this._extra);

        return Syncbird.try(() => {
            const iterator = this._fields[Symbol.iterator]();
            const iterate: () => StructValue | Syncbird<StructValue> = () => {
                const result = iterator.next();
                if (result.done) {
                    return value;
                }

                const [name, definition] = result.value;
                return Syncbird.resolve(
                    definition.deserialize(this.options, stream as any, value)
                ).then(fieldValue => {
                    value.set(name, fieldValue);
                    return iterate();
                });
            };
            return iterate();
        }).then(value => {
            if (this._postDeserialized) {
                const object = value.value as TFields;
                const result = this._postDeserialized.call(object, object);
                if (result) {
                    return result;
                }
            }

            return value.value;
        }).valueOrPromise();
    }

    public serialize(init: Evaluate<Omit<TFields, TOmitInitKey>>): ArrayBuffer {
        const value = new StructValue();

        for (const [name, definition] of this._fields) {
            const fieldValue = definition.create(this.options, value, (init as any)[name]);
            value.set(name, fieldValue);
        }

        let structSize = 0;
        const fieldsInfo: { fieldValue: StructFieldValue, size: number; }[] = [];

        for (const [name] of this._fields) {
            const fieldValue = value.get(name);
            const size = fieldValue.getSize();
            fieldsInfo.push({ fieldValue, size });
            structSize += size;
        }

        const buffer = new ArrayBuffer(structSize);
        const dataView = new DataView(buffer);
        let offset = 0;
        for (const { fieldValue, size } of fieldsInfo) {
            fieldValue.serialize(dataView, offset);
            offset += size;
        }

        return buffer;
    }
}
