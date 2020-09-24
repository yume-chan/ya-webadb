import { Array, BackingField, FieldDescriptorBase, FieldDescriptorBaseOptions, FieldType, FixedLengthArray, getFieldTypeDefinition, Number, StructDeserializationContext, StructOptions, StructSerializationContext, VariableLengthArray } from './field';
import { Evaluate, Identity } from './utils';

export type StructValueType<T extends Struct<unknown, unknown, unknown>> =
    T extends { deserialize(reader: StructDeserializationContext): Promise<infer R>; } ? R : never;

export type StructInitType<T extends Struct<unknown, unknown, unknown>> =
    T extends { create(value: infer R, ...args: any): any; } ? R : never;

export const StructDefaultOptions: Readonly<StructOptions> = {
    littleEndian: false,
};

interface AddArrayFieldDescriptor<TObject, TAfterParsed, TInit> {
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
        TObject,
        TAfterParsed,
        TInit,
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
        TObject,
        TAfterParsed,
        TInit,
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
    TObject,
    TAfterParsed,
    TInit,
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
        TObject,
        TAfterParsed,
        TInit,
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
        _typescriptType?: () => TTypeScriptType,
    ): MergeStruct<
        TObject,
        TAfterParsed,
        TInit,
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

export type StructAfterParsed<TObject, TResult> =
    (this: TObject, object: TObject) => TResult;

export type OmitNever<T> = Pick<T, { [K in keyof T]: [T[K]] extends [never] ? never : K }[keyof T]>;

type MergeStruct<TObject, TAfterParsed, TInit, TDescriptor extends FieldDescriptorBase> =
    Identity<Struct<
        Evaluate<TObject & Exclude<TDescriptor['resultObject'], undefined>>,
        TAfterParsed,
        Evaluate<OmitNever<TInit & Exclude<TDescriptor['initObject'], undefined>>>
    >>;

export type StructExtraResult<TObject, TExtra> =
    Evaluate<Omit<TObject, keyof TExtra> & TExtra>;

export default class Struct<TObject = {}, TAfterParsed = undefined, TInit = {}> {
    public readonly options: Readonly<StructOptions>;

    private _size = 0;
    public get size() { return this._size; }

    private fields: FieldDescriptorBase[] = [];

    private _extra: PropertyDescriptorMap = {};

    private _afterParsed?: StructAfterParsed<any, any>;

    public constructor(options: Partial<StructOptions> = StructDefaultOptions) {
        this.options = { ...StructDefaultOptions, ...options };
    }

    private clone(): Struct<any, any, any> {
        const result = new Struct<any, any, any>(this.options);
        result.fields = this.fields.slice();
        result._size = this._size;
        result._extra = this._extra;
        result._afterParsed = this._afterParsed;
        return result;
    }

    public field<TDescriptor extends FieldDescriptorBase>(
        field: TDescriptor,
    ): MergeStruct<TObject, TAfterParsed, TInit, TDescriptor> {
        const result = this.clone();
        result.fields.push(field);

        const definition = getFieldTypeDefinition(field.type);
        const size = definition.getSize({ field, options: this.options });
        result._size += size;

        return result;
    }

    private number<
        TName extends string,
        TTypeScriptType = Number.TypeScriptType
    >(
        name: TName,
        type: Number.SubType,
        options: FieldDescriptorBaseOptions = {},
        _typescriptType?: () => TTypeScriptType,
    ) {
        return this.field<Number<TName, TTypeScriptType>>({
            type: FieldType.Number,
            name,
            subType: type,
            options,
        });
    }

    public int32<
        TName extends string,
        TTypeScriptType = Number.TypeScriptType
    >(
        name: TName,
        options: FieldDescriptorBaseOptions = {},
        _typescriptType?: () => TTypeScriptType,
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
        TTypeScriptType = Number.TypeScriptType
    >(
        name: TName,
        options: FieldDescriptorBaseOptions = {},
        _typescriptType?: () => TTypeScriptType,
    ) {
        return this.number(
            name,
            Number.SubType.Uint32,
            options,
            _typescriptType
        );
    }

    private array: AddArrayFieldDescriptor<TObject, TAfterParsed, TInit> = (
        name: string,
        type: Array.SubType,
        options: FixedLengthArray.Options | VariableLengthArray.Options
    ): Struct<any, any, any> => {
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
        TObject,
        TAfterParsed,
        TInit,
        Array.SubType.ArrayBuffer
    > = <TName extends string>(
        name: TName,
        options: any
    ) => {
            return this.array(name, Array.SubType.ArrayBuffer, options);
        };

    public string: AddArraySubTypeFieldDescriptor<
        TObject,
        TAfterParsed,
        TInit,
        Array.SubType.String
    > = <TName extends string>(
        name: TName,
        options: any
    ) => {
            return this.array(name, Array.SubType.String, options);
        };

    public extra<TExtra extends object>(
        value: TExtra & ThisType<StructExtraResult<TObject, TExtra>>
    ): Struct<
        StructExtraResult<TObject, TExtra>,
        TAfterParsed,
        Evaluate<Omit<TInit, keyof TExtra>>
    > {
        const result = this.clone();
        result._extra = { ...result._extra, ...Object.getOwnPropertyDescriptors(value) };
        return result;
    }

    public afterParsed(
        callback: StructAfterParsed<TObject, never>
    ): Struct<TObject, never, TInit>;
    public afterParsed(
        callback?: StructAfterParsed<TObject, void>
    ): Struct<TObject, undefined, TInit>;
    public afterParsed<TResult>(
        callback?: StructAfterParsed<TObject, TResult>
    ): Struct<TObject, TResult, TInit>;
    public afterParsed(
        callback?: StructAfterParsed<TObject, any>
    ): Struct<any, any, any> {
        const result = this.clone();
        result._afterParsed = callback;
        return result;
    }

    public create(init: TInit, context: StructSerializationContext): TObject {
        const object: any = {
            [BackingField]: {},
        };

        for (const field of this.fields) {
            const type = getFieldTypeDefinition(field.type);
            if (type.initialize) {
                type.initialize({
                    context,
                    field,
                    init,
                    object,
                    options: this.options,
                });
            } else {
                object[field.name] = (init as any)[field.name];
            }
        }

        Object.defineProperties(object, this._extra);
        return object;
    }

    public async deserialize(
        context: StructDeserializationContext
    ): Promise<TAfterParsed extends undefined ? TObject : TAfterParsed> {
        const object: any = {
            [BackingField]: {},
        };

        for (const field of this.fields) {
            await getFieldTypeDefinition(field.type).deserialize({
                context,
                field,
                object,
                options: this.options,
            });
        }

        Object.defineProperties(object, this._extra);

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
