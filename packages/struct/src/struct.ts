import { BackingField, defineSimpleAccessors, setBackingField, WithBackingField } from './backing-field';
import { Array, FieldDescriptorBase, FieldDescriptorBaseOptions, FieldType, FieldTypeDefinition, FixedLengthArray, getFieldTypeDefinition, Number, VariableLengthArray } from './field';
import { StructDefaultOptions, StructDeserializationContext, StructOptions, StructSerializationContext } from './types';
import { Evaluate, Identity, OmitNever, Overwrite } from './utils';

export type StructValueType<T extends Struct<object, object, object, unknown>> =
    T extends { deserialize(reader: StructDeserializationContext): Promise<infer R>; } ? R : never;

export type StructInitType<T extends Struct<object, object, object, unknown>> =
    T extends { create(value: infer R, ...args: any): any; } ? Evaluate<R> : never;

interface AddArrayFieldDescriptor<
    TResult extends object,
    TInit extends object,
    TExtra extends object,
    TAfterParsed
    > {
    <
        TName extends string,
        TType extends Array.SubType,
        TTypeScriptType = Array.TypeScriptType<TType>
        >(
        name: TName,
        type: TType,
        options: FixedLengthArray.Options,
        typescriptType?: () => TTypeScriptType,
    ): MergeStruct<
        TResult,
        TInit,
        TExtra,
        TAfterParsed,
        FixedLengthArray<
            TName,
            TType,
            TTypeScriptType
        >
    >;

    <
        TName extends string,
        TType extends Array.SubType,
        TLengthField extends VariableLengthArray.KeyOfType<TInit, number>,
        TEmptyBehavior extends VariableLengthArray.EmptyBehavior,
        TTypeScriptType = VariableLengthArray.TypeScriptType<TType, TEmptyBehavior>
        >(
        name: TName,
        type: TType,
        options: VariableLengthArray.Options<TInit, TLengthField, TEmptyBehavior>,
        typescriptType?: () => TTypeScriptType,
    ): MergeStruct<
        TResult,
        TInit,
        TExtra,
        TAfterParsed,
        VariableLengthArray<
            TName,
            TType,
            TInit,
            TLengthField,
            TEmptyBehavior,
            TTypeScriptType
        >
    >;
}

interface AddArraySubTypeFieldDescriptor<
    TResult extends object,
    TInit extends object,
    TExtra extends object,
    TAfterParsed,
    TType extends Array.SubType
    > {
    <
        TName extends string,
        TTypeScriptType = Array.TypeScriptType<TType>
        >(
        name: TName,
        options: FixedLengthArray.Options,
        typescriptType?: () => TTypeScriptType,
    ): MergeStruct<
        TResult,
        TInit,
        TExtra,
        TAfterParsed,
        FixedLengthArray<
            TName,
            TType,
            TTypeScriptType
        >
    >;

    <
        TName extends string,
        TLengthField extends VariableLengthArray.KeyOfType<TInit, number>,
        TEmptyBehavior extends VariableLengthArray.EmptyBehavior,
        TTypeScriptType = VariableLengthArray.TypeScriptType<TType, TEmptyBehavior>
        >(
        name: TName,
        options: VariableLengthArray.Options<TInit, TLengthField, TEmptyBehavior>,
        _typescriptType?: TTypeScriptType,
    ): MergeStruct<
        TResult,
        TInit,
        TExtra,
        TAfterParsed,
        VariableLengthArray<
            TName,
            TType,
            TInit,
            TLengthField,
            TEmptyBehavior,
            TTypeScriptType
        >
    >;
}

type MergeStruct<
    TResult extends object,
    TInit extends object,
    TExtra extends object,
    TAfterParsed,
    TDescriptor extends FieldDescriptorBase
    > =
    Identity<Struct<
        Evaluate<TResult & Exclude<TDescriptor['resultObject'], undefined>>,
        OmitNever<TInit & Exclude<TDescriptor['initObject'], undefined>>,
        TExtra,
        TAfterParsed
    >>;

export type StructAfterParsed<TResult, TAfterParsed> =
    (this: WithBackingField<TResult>, object: WithBackingField<TResult>) => TAfterParsed;

export default class Struct<
    TResult extends object = {},
    TInit extends object = {},
    TExtra extends object = {},
    TAfterParsed = undefined,
    > {
    public readonly options: Readonly<StructOptions>;

    private _size = 0;
    public get size() { return this._size; }

    private fields: FieldDescriptorBase[] = [];

    private _extra: PropertyDescriptorMap = {};

    private _afterParsed?: StructAfterParsed<any, any>;

    public constructor(options: Partial<StructOptions> = StructDefaultOptions) {
        this.options = { ...StructDefaultOptions, ...options };
    }

    private clone(): Struct<any, any, any, any> {
        const result = new Struct<any, any, any, any>(this.options);
        result.fields = this.fields.slice();
        result._size = this._size;
        result._extra = this._extra;
        result._afterParsed = this._afterParsed;
        return result;
    }

    public field<TDescriptor extends FieldDescriptorBase>(
        field: TDescriptor,
    ): MergeStruct<TResult, TInit, TExtra, TAfterParsed, TDescriptor> {
        const result = this.clone();
        result.fields.push(field);

        const definition = getFieldTypeDefinition(field.type);
        const size = definition.getSize({ field, options: this.options });
        result._size += size;

        return result;
    }

    private number<
        TName extends string,
        TSubType extends Number.SubType = Number.SubType,
        TTypeScriptType = Number.TypeScriptType<TSubType>
    >(
        name: TName,
        type: TSubType,
        options: FieldDescriptorBaseOptions = {},
        _typescriptType?: TTypeScriptType,
    ) {
        return this.field<Number<TName, TSubType, TTypeScriptType>>({
            type: FieldType.Number,
            name,
            subType: type,
            options,
        });
    }

    public int32<
        TName extends string,
        TTypeScriptType = Number.TypeScriptType<Number.SubType.Int32>
    >(
        name: TName,
        options: FieldDescriptorBaseOptions = {},
        _typescriptType?: TTypeScriptType,
    ) {
        return this.number(
            name,
            Number.SubType.Int32,
            options,
            _typescriptType
        );
    }

    public uint32<
        TName extends string,
        TTypeScriptType = Number.TypeScriptType<Number.SubType.Uint32>
    >(
        name: TName,
        options: FieldDescriptorBaseOptions = {},
        _typescriptType?: TTypeScriptType,
    ) {
        return this.number(
            name,
            Number.SubType.Uint32,
            options,
            _typescriptType
        );
    }

    public uint64<
        TName extends string,
        TTypeScriptType = Number.TypeScriptType<Number.SubType.Uint64>
    >(
        name: TName,
        options: FieldDescriptorBaseOptions = {},
        _typescriptType?: TTypeScriptType,
    ) {
        return this.number(
            name,
            Number.SubType.Uint64,
            options,
            _typescriptType
        );
    }

    private array: AddArrayFieldDescriptor<TResult, TInit, TExtra, TAfterParsed> = (
        name: string,
        type: Array.SubType,
        options: FixedLengthArray.Options | VariableLengthArray.Options
    ): Struct<any, any, any, any> => {
        if ('length' in options) {
            return this.field<FixedLengthArray>({
                type: FieldType.FixedLengthArray,
                name,
                subType: type,
                options: options,
            });
        } else {
            return this.field<VariableLengthArray>({
                type: FieldType.VariableLengthArray,
                name,
                subType: type,
                options: options,
            });
        }
    };

    public arrayBuffer: AddArraySubTypeFieldDescriptor<
        TResult,
        TInit,
        TExtra,
        TAfterParsed,
        Array.SubType.ArrayBuffer
    > = <TName extends string>(
        name: TName,
        options: any
    ) => {
            return this.array(name, Array.SubType.ArrayBuffer, options);
        };

    public string: AddArraySubTypeFieldDescriptor<
        TResult,
        TInit,
        TExtra,
        TAfterParsed,
        Array.SubType.String
    > = <TName extends string>(
        name: TName,
        options: any
    ) => {
            return this.array(name, Array.SubType.String, options);
        };

    public extra<TValue extends Record<
        Exclude<
            keyof TValue,
            Exclude<keyof TValue, keyof TResult>>,
        never
    >>(
        value: TValue & ThisType<WithBackingField<Overwrite<Overwrite<TExtra, TValue>, TResult>>>
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

    private initializeField(
        context: StructSerializationContext,
        field: FieldDescriptorBase,
        fieldTypeDefinition: FieldTypeDefinition<any, any>,
        object: any,
        value: any,
        extra?: any
    ) {
        if (fieldTypeDefinition.initialize) {
            fieldTypeDefinition.initialize({
                context,
                extra,
                field,
                object,
                options: this.options,
                value,
            });
        } else {
            setBackingField(object, field.name, value);
            defineSimpleAccessors(object, field.name);
        }
    }

    public create(init: TInit, context: StructSerializationContext): Overwrite<TExtra, TResult> {
        const object: any = {
            [BackingField]: {},
        };
        Object.defineProperties(object, this._extra);

        for (const field of this.fields) {
            const fieldTypeDefinition = getFieldTypeDefinition(field.type);
            this.initializeField(
                context,
                field,
                fieldTypeDefinition,
                object,
                (init as any)[field.name]
            );
        }

        return object;
    }

    public async deserialize(
        context: StructDeserializationContext
    ): Promise<TAfterParsed extends undefined ? Overwrite<TExtra, TResult> : TAfterParsed> {
        const object: any = {
            [BackingField]: {},
        };
        Object.defineProperties(object, this._extra);

        for (const field of this.fields) {
            const fieldTypeDefinition = getFieldTypeDefinition(field.type);
            const { value, extra } = await fieldTypeDefinition.deserialize({
                context,
                field,
                object,
                options: this.options,
            });
            this.initializeField(
                context,
                field,
                fieldTypeDefinition,
                object,
                value,
                extra
            );
        }

        if (this._afterParsed) {
            const result = this._afterParsed.call(object, object);
            if (result) {
                return result;
            }
        }

        return object;
    }

    public serialize(init: TInit, context: StructSerializationContext): ArrayBuffer {
        const object = this.create(init, context) as any;

        let size = this._size;
        let fieldSize: number[] = [];
        for (let i = 0; i < this.fields.length; i++) {
            const field = this.fields[i];
            const type = getFieldTypeDefinition(field.type);
            if (type.getDynamicSize) {
                fieldSize[i] = type.getDynamicSize({
                    context,
                    field,
                    object,
                    options: this.options,
                });
                size += fieldSize[i];
            } else {
                fieldSize[i] = type.getSize({ field, options: this.options });
            }
        }

        const buffer = new ArrayBuffer(size);
        const dataView = new DataView(buffer);
        let offset = 0;
        for (let i = 0; i < this.fields.length; i++) {
            const field = this.fields[i];
            const type = getFieldTypeDefinition(field.type);
            type.serialize({
                context,
                dataView,
                field,
                object,
                offset,
                options: this.options,
            });
            offset += fieldSize[i];
        }
        return buffer;
    }
}
