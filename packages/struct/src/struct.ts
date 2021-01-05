import { BuiltInFieldType, createObjectWithRuntimeValues, FieldDescriptorBase, FieldDescriptorBaseOptions, FieldRuntimeValue, getRuntimeValue, GlobalStructFieldRuntimeTypeRegistry, setRuntimeValue, StructDefaultOptions, StructDeserializationContext, StructOptions, StructSerializationContext } from './runtime';
import { ArrayBufferLikeFieldDescriptor, Evaluate, FixedLengthArrayBufferFieldDescriptor, Identity, KeysOfType, NumberFieldDescriptor, NumberFieldSubType, OmitNever, Overwrite, VariableLengthArrayBufferFieldDescriptor } from './types';

/**
 * Extract the value type of the specified `Struct`
 *
 * The lack of generic constraint is on purpose to allow `StructLike` types
 */
export type StructValueType<T> =
    T extends { deserialize(context: StructDeserializationContext): Promise<infer R>; } ? R : never;

/**
 * Extract the init type of the specified `Struct`
 */
export type StructInitType<T extends Struct<object, object, object, unknown>> =
    T extends { create(value: infer R, ...args: any): any; } ? Evaluate<R> : never;

/**
 * Create a new `Struct` type with `TDescriptor` appended
 */
type AddFieldDescriptor<
    TValue extends object,
    TInit extends object,
    TExtra extends object,
    TAfterParsed,
    TDescriptor extends FieldDescriptorBase> =
    Identity<Struct<
        // Merge two types
        Evaluate<
            TValue &
            // `TDescriptor.resultObject` is optional, so remove `undefined` from its type
            Exclude<TDescriptor['resultObject'], undefined>
        >,
        // `TDescriptor.initObject` signals removal of fields by setting its type to `never`
        // I don't `Evaluate` here, because if I do, the result type will become too complex,
        // and TypeScript will refuse to evaluate it.
        OmitNever<
            TInit &
            // `TDescriptor.initObject` is optional, so remove `undefined` from its type
            Exclude<TDescriptor['initObject'], undefined>
        >,
        TExtra,
        TAfterParsed
    >>;

/**
 * Overload methods to add an array typed field
 */
interface AddArrayBufferFieldDescriptor<
    TValue extends object,
    TInit extends object,
    TExtra extends object,
    TAfterParsed
    > {
    /**
     * Append a fixed-length array to the `Struct`
     *
     * @param name Name of the field
     * @param type `Array.SubType.ArrayBuffer` or `Array.SubType.String`
     * @param options Fixed-length array options
     * @param typescriptType Type of the field in TypeScript.
     * For example, if this field is a string, you can declare it as a string enum or literal union.
     */
    <
        TName extends string,
        TType extends ArrayBufferLikeFieldDescriptor.SubType,
        TTypeScriptType extends ArrayBufferLikeFieldDescriptor.TypeScriptType<TType> = ArrayBufferLikeFieldDescriptor.TypeScriptType<TType>
        >(
        name: TName,
        type: TType,
        options: FixedLengthArrayBufferFieldDescriptor.Options,
        typescriptType?: TTypeScriptType,
    ): AddFieldDescriptor<
        TValue,
        TInit,
        TExtra,
        TAfterParsed,
        FixedLengthArrayBufferFieldDescriptor<
            TName,
            TType,
            TTypeScriptType
        >
    >;

    /**
     * Append a variable-length array to the `Struct`
     */
    <
        TName extends string,
        TType extends ArrayBufferLikeFieldDescriptor.SubType,
        TLengthField extends KeysOfType<TInit, number | string>,
        TTypeScriptType = ArrayBufferLikeFieldDescriptor.TypeScriptType<TType>
        >(
        name: TName,
        type: TType,
        options: VariableLengthArrayBufferFieldDescriptor.Options<TInit, TLengthField>,
        typescriptType?: TTypeScriptType,
    ): AddFieldDescriptor<
        TValue,
        TInit,
        TExtra,
        TAfterParsed,
        VariableLengthArrayBufferFieldDescriptor<
            TName,
            TType,
            TInit,
            TLengthField,
            TTypeScriptType
        >
    >;
}

interface AddArrayBufferSubTypeFieldDescriptor<
    TResult extends object,
    TInit extends object,
    TExtra extends object,
    TAfterParsed,
    TType extends ArrayBufferLikeFieldDescriptor.SubType
    > {
    <
        TName extends string,
        TTypeScriptType = ArrayBufferLikeFieldDescriptor.TypeScriptType<TType>
        >(
        name: TName,
        options: FixedLengthArrayBufferFieldDescriptor.Options,
        typescriptType?: TTypeScriptType,
    ): AddFieldDescriptor<
        TResult,
        TInit,
        TExtra,
        TAfterParsed,
        FixedLengthArrayBufferFieldDescriptor<
            TName,
            TType,
            TTypeScriptType
        >
    >;

    <
        TName extends string,
        TLengthField extends KeysOfType<TInit, number | string>,
        TTypeScriptType = ArrayBufferLikeFieldDescriptor.TypeScriptType<TType>
        >(
        name: TName,
        options: VariableLengthArrayBufferFieldDescriptor.Options<TInit, TLengthField>,
        _typescriptType?: TTypeScriptType,
    ): AddFieldDescriptor<
        TResult,
        TInit,
        TExtra,
        TAfterParsed,
        VariableLengthArrayBufferFieldDescriptor<
            TName,
            TType,
            TInit,
            TLengthField,
            TTypeScriptType
        >
    >;
}

export type StructAfterParsed<TResult, TAfterParsed> =
    (this: TResult, object: TResult) => TAfterParsed;

export default class Struct<
    TResult extends object = {},
    TInit extends object = {},
    TExtra extends object = {},
    TAfterParsed = undefined,
    > {
    public readonly options: Readonly<StructOptions>;

    private _size = 0;
    public get size() { return this._size; }

    private fieldDescriptors: FieldDescriptorBase[] = [];

    private _extra: PropertyDescriptorMap = {};

    private _afterParsed?: StructAfterParsed<any, any>;

    public constructor(options?: Partial<StructOptions>) {
        this.options = { ...StructDefaultOptions, ...options };
    }

    private clone(): Struct<any, any, any, any> {
        const result = new Struct<any, any, any, any>(this.options);
        result.fieldDescriptors = this.fieldDescriptors.slice();
        result._size = this._size;
        result._extra = this._extra;
        result._afterParsed = this._afterParsed;
        return result;
    }

    public field<TDescriptor extends FieldDescriptorBase>(
        descriptor: TDescriptor,
    ): AddFieldDescriptor<TResult, TInit, TExtra, TAfterParsed, TDescriptor> {
        const result = this.clone();
        result.fieldDescriptors.push(descriptor);

        const Constructor = GlobalStructFieldRuntimeTypeRegistry.get(descriptor.type);
        const size = Constructor.getSize(descriptor, this.options);
        result._size += size;

        return result;
    }

    private number<
        TName extends string,
        TType extends NumberFieldSubType = NumberFieldSubType,
        TTypeScriptType = TType['value']
    >(
        name: TName,
        type: TType,
        options: FieldDescriptorBaseOptions = {},
        _typescriptType?: TTypeScriptType,
    ) {
        return this.field<NumberFieldDescriptor<TName, TType, TTypeScriptType>>({
            type: BuiltInFieldType.Number,
            name,
            subType: type,
            options,
        });
    }

    public uint8<
        TName extends string,
        TTypeScriptType = (typeof NumberFieldSubType)['Uint8']['value']
    >(
        name: TName,
        options: FieldDescriptorBaseOptions = {},
        _typescriptType?: TTypeScriptType,
    ) {
        return this.number(
            name,
            NumberFieldSubType.Uint8,
            options,
            _typescriptType
        );
    }

    public uint16<
        TName extends string,
        TTypeScriptType = (typeof NumberFieldSubType)['Uint16']['value']
    >(
        name: TName,
        options: FieldDescriptorBaseOptions = {},
        _typescriptType?: TTypeScriptType,
    ) {
        return this.number(
            name,
            NumberFieldSubType.Uint16,
            options,
            _typescriptType
        );
    }

    public int32<
        TName extends string,
        TTypeScriptType = (typeof NumberFieldSubType)['Int32']['value']
    >(
        name: TName,
        options: FieldDescriptorBaseOptions = {},
        _typescriptType?: TTypeScriptType,
    ) {
        return this.number(
            name,
            NumberFieldSubType.Int32,
            options,
            _typescriptType
        );
    }

    public uint32<
        TName extends string,
        TTypeScriptType = (typeof NumberFieldSubType)['Uint32']['value']
    >(
        name: TName,
        options: FieldDescriptorBaseOptions = {},
        typescriptType?: TTypeScriptType,
    ) {
        return this.number(
            name,
            NumberFieldSubType.Uint32,
            options,
            typescriptType
        );
    }

    public int64<
        TName extends string,
        TTypeScriptType = (typeof NumberFieldSubType)['Int64']['value']
    >(
        name: TName,
        options: FieldDescriptorBaseOptions = {},
        _typescriptType?: TTypeScriptType,
    ) {
        return this.number(
            name,
            NumberFieldSubType.Int64,
            options,
            _typescriptType
        );
    }

    public uint64<
        TName extends string,
        TTypeScriptType = (typeof NumberFieldSubType)['Uint64']['value']
    >(
        name: TName,
        options: FieldDescriptorBaseOptions = {},
        _typescriptType?: TTypeScriptType,
    ) {
        return this.number(
            name,
            NumberFieldSubType.Uint64,
            options,
            _typescriptType
        );
    }

    private arrayBufferLike: AddArrayBufferFieldDescriptor<TResult, TInit, TExtra, TAfterParsed> = (
        name: string,
        type: ArrayBufferLikeFieldDescriptor.SubType,
        options: FixedLengthArrayBufferFieldDescriptor.Options | VariableLengthArrayBufferFieldDescriptor.Options
    ): Struct<any, any, any, any> => {
        if ('length' in options) {
            return this.field<FixedLengthArrayBufferFieldDescriptor>({
                type: BuiltInFieldType.FixedLengthArrayBufferLike,
                name,
                subType: type,
                options: options,
            });
        } else {
            return this.field<VariableLengthArrayBufferFieldDescriptor>({
                type: BuiltInFieldType.VariableLengthArrayBufferLike,
                name,
                subType: type,
                options: options,
            });
        }
    };

    public arrayBuffer: AddArrayBufferSubTypeFieldDescriptor<
        TResult,
        TInit,
        TExtra,
        TAfterParsed,
        ArrayBufferLikeFieldDescriptor.SubType.ArrayBuffer
    > = <TName extends string>(
        name: TName,
        options: any
    ) => {
            return this.arrayBufferLike(name, ArrayBufferLikeFieldDescriptor.SubType.ArrayBuffer, options);
        };

    public string: AddArrayBufferSubTypeFieldDescriptor<
        TResult,
        TInit,
        TExtra,
        TAfterParsed,
        ArrayBufferLikeFieldDescriptor.SubType.String
    > = <TName extends string>(
        name: TName,
        options: any
    ) => {
            return this.arrayBufferLike(name, ArrayBufferLikeFieldDescriptor.SubType.String, options);
        };

    public extra<TValue extends Record<
        Exclude<
            keyof TValue,
            Exclude<keyof TValue, keyof TResult>>,
        never
    >>(
        value: TValue & ThisType<Overwrite<Overwrite<TExtra, TValue>, TResult>>
    ): Struct<
        TResult,
        TInit,
        Overwrite<TExtra, TValue>,
        TAfterParsed
    > {
        const result = this.clone();
        result._extra = { ...result._extra, ...Object.getOwnPropertyDescriptors(value) };
        return result;
    }

    public afterParsed(
        callback: StructAfterParsed<TResult, never>
    ): Struct<TResult, TInit, TExtra, never>;
    public afterParsed(
        callback?: StructAfterParsed<TResult, void>
    ): Struct<TResult, TInit, TExtra, undefined>;
    public afterParsed<TAfterParsed>(
        callback?: StructAfterParsed<TResult, TAfterParsed>
    ): Struct<TResult, TInit, TExtra, TAfterParsed>;
    public afterParsed(
        callback?: StructAfterParsed<TResult, any>
    ) {
        const result = this.clone();
        result._afterParsed = callback;
        return result;
    }

    private initializeObject(context: StructSerializationContext) {
        const object = createObjectWithRuntimeValues();
        Object.defineProperties(object, this._extra);

        for (const descriptor of this.fieldDescriptors) {
            const Constructor = GlobalStructFieldRuntimeTypeRegistry.get(descriptor.type);

            const runtimeValue = new Constructor(descriptor, this.options, context, object);
            setRuntimeValue(object, descriptor.name, runtimeValue);
        }

        return object;
    }

    public create(init: TInit, context: StructSerializationContext): Overwrite<TExtra, TResult> {
        const object = this.initializeObject(context);

        for (const { name: fieldName } of this.fieldDescriptors) {
            const runtimeValue = getRuntimeValue(object, fieldName);
            runtimeValue.set((init as any)[fieldName]);
        }

        return object as any;
    }

    public async deserialize(
        context: StructDeserializationContext
    ): Promise<TAfterParsed extends undefined ? Overwrite<TExtra, TResult> : TAfterParsed> {
        const object = this.initializeObject(context);

        for (const { name: fieldName } of this.fieldDescriptors) {
            const runtimeValue = getRuntimeValue(object, fieldName);
            await runtimeValue.deserialize(context, object);
        }

        if (this._afterParsed) {
            const result = this._afterParsed.call(object, object);
            if (result) {
                return result;
            }
        }

        return object as any;
    }

    public serialize(init: TInit, context: StructSerializationContext): ArrayBuffer {
        const object = this.create(init, context) as any;

        let structSize = 0;
        const fieldsInfo: { runtimeValue: FieldRuntimeValue, size: number; }[] = [];

        for (const { name: fieldName } of this.fieldDescriptors) {
            const runtimeValue = getRuntimeValue(object, fieldName);
            const size = runtimeValue.getSize();
            fieldsInfo.push({ runtimeValue, size });
            structSize += size;
        }

        const buffer = new ArrayBuffer(structSize);
        const dataView = new DataView(buffer);
        let offset = 0;
        for (const { runtimeValue, size } of fieldsInfo) {
            runtimeValue.serialize(dataView, offset, context);
            offset += size;
        }

        return buffer;
    }
}
