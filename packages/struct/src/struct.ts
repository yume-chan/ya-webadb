const BackingField = Symbol('BackingField');

export namespace StructField {
    export const enum Type {
        Number,
        FixedLengthArray,
        VariableLengthArray,
    }

    export interface BaseOptions {

    }

    export interface Base<TOptions extends BaseOptions = BaseOptions> {
        type: Type;

        name: PropertyKey;

        options: TOptions;
    }

    export type Parser<TField extends Any> = (options: {
        field: TField;
        object: any;
        options: StructOptions;
        reader: StructReader;
    }) => Promise<void>;

    export type Initializer<TField extends Any> = (options: {
        field: TField;
        init: any;
        object: any;
        options: StructOptions;
        writer: StructWriter;
    }) => void;

    export type Writer<TField extends Any> = (options: {
        dataView: DataView;
        field: TField;
        object: any;
        offset: number;
        options: StructOptions;
        writer: StructWriter;
    }) => void;

    export interface Methods<TField extends Any> {
        type: Type;

        getLength(options: {
            field: TField;
            options: StructOptions;
        }): number;

        parse: Parser<TField>;

        initialize?: Initializer<TField>;

        getVariableLength?(options: {
            field: TField,
            object: any,
            options: StructOptions,
            writer: StructWriter,
        }): number;

        write: Writer<TField>;
    }

    const registry: Record<number, Methods<any>> = {};

    export function getType(type: Type): Methods<Any> {
        return registry[type as number];
    }

    export function registerType<TField extends Any, TMethods extends Methods<TField>>(
        _field: TField,
        methods: TMethods
    ): void {
        registry[methods.type as number] = methods;
    }

    export namespace Number {
        export type TypeScriptType = number;

        export const enum SubType {
            Int32,
            Uint32,
        }

        export const SizeMap: Record<SubType, number> = {
            [SubType.Int32]: 4,
            [SubType.Uint32]: 4,
        };

        export const DataViewGetterMap = {
            [SubType.Int32]: 'getInt32',
            [SubType.Uint32]: 'getUint32',
        } as const;

        export const DataViewSetterMap = {
            [SubType.Int32]: 'setInt32',
            [SubType.Uint32]: 'setUint32',
        } as const;
    }

    registerType(undefined as unknown as Number, {
        type: Type.Number,

        getLength({ field }) {
            return Number.SizeMap[field.subType];
        },

        async parse({ field, object, options, reader }) {
            const buffer = await reader.read(Number.SizeMap[field.subType]);
            const view = new DataView(buffer);
            object[field.name] = view[Number.DataViewGetterMap[field.subType]](
                0,
                options.littleEndian
            );
        },

        write({ dataView, field, object, offset, options }) {
            dataView[Number.DataViewSetterMap[field.subType]](
                offset,
                object[field.name],
                options.littleEndian
            );
        },
    });

    export interface Number<TOptions extends BaseOptions = BaseOptions> extends Base<TOptions> {
        type: Type.Number;

        subType: Number.SubType;
    }

    export namespace Array {
        export const enum SubType {
            ArrayBuffer,
            String,
        }

        export type TypeScriptType<TType extends SubType = SubType> =
            TType extends SubType.ArrayBuffer ? ArrayBuffer :
            TType extends SubType.String ? string :
            ArrayBuffer | string;

        export interface BackingField {
            buffer?: ArrayBuffer;

            string?: string;
        }

        export function getBackingField(object: any, name: PropertyKey): BackingField {
            return object[BackingField][name];
        }

        export function setBackingField(object: any, name: PropertyKey, value: BackingField): void {
            object[BackingField][name] = value;
        }

        export function initialize(object: any, field: Array, value: BackingField): void {
            switch (field.subType) {
                case StructField.Array.SubType.ArrayBuffer:
                    Object.defineProperty(object, field.name, {
                        configurable: true,
                        enumerable: true,
                        get(): ArrayBuffer {
                            return getBackingField(object, field.name).buffer!;
                        },
                        set(buffer: ArrayBuffer) {
                            setBackingField(object, field.name, { buffer });
                        },
                    });
                    break;
                case StructField.Array.SubType.String:
                    Object.defineProperty(object, field.name, {
                        configurable: true,
                        enumerable: true,
                        get(): string {
                            return getBackingField(object, field.name).string!;
                        },
                        set(string: string) {
                            setBackingField(object, field.name, { string });
                        },
                    });
                    break;
                default:
                    throw new Error('Unknown type');
            }
            setBackingField(object, field.name, value);
        }
    }

    export interface Array<
        TType extends Array.SubType = Array.SubType,
        TOptions extends BaseOptions = BaseOptions
        > extends Base<TOptions> {
        subType: TType;
    }

    export namespace FixedLengthArray {
        export interface Options extends BaseOptions {
            length: number;
        }
    }

    registerType(undefined as unknown as FixedLengthArray, {
        type: Type.FixedLengthArray,

        getLength({ field }) {
            return field.options.length;
        },

        async parse({ field, object, reader }) {
            const value: Array.BackingField = {
                buffer: await reader.read(field.options.length),
            };

            switch (field.subType) {
                case Array.SubType.ArrayBuffer:
                    break;
                case Array.SubType.String:
                    value.string = reader.decodeUtf8(value.buffer!);
                    break;
                default:
                    throw new Error('Unknown type');
            }

            Array.initialize(object, field, value);
        },

        initialize({ field, init, object }) {
            Array.initialize(object, field, {});
            object[field.name] = init[field.name];
        },

        write({ dataView, field, object, offset, writer }) {
            const backingField = Array.getBackingField(object, field.name);
            backingField.buffer ??=
                writer.encodeUtf8(backingField.string!);

            new Uint8Array(dataView.buffer).set(
                new Uint8Array(backingField.buffer),
                offset
            );
        }
    });

    export interface FixedLengthArray<
        TType extends Array.SubType = Array.SubType,
        TOptions extends FixedLengthArray.Options = FixedLengthArray.Options
        > extends Array<TType, TOptions> {
        type: Type.FixedLengthArray;

        options: TOptions;
    }

    export namespace VariableLengthArray {
        export type TypeScriptTypeCanBeUndefined<
            TEmptyBehavior extends EmptyBehavior = EmptyBehavior
            > =
            TEmptyBehavior extends EmptyBehavior.Empty ? never :
            undefined;

        export type TypeScriptType<
            TType extends Array.SubType = Array.SubType,
            TEmptyBehavior extends EmptyBehavior = EmptyBehavior
            > =
            Array.TypeScriptType<TType> |
            TypeScriptTypeCanBeUndefined<TEmptyBehavior>;

        export const enum EmptyBehavior {
            Undefined,
            Empty,
        }

        export type KeyOfType<TObject, TProperty> =
            {
                [TKey in keyof TObject]:
                TObject[TKey] extends TProperty ? TKey : never
            }[keyof TObject];

        export interface Options<
            TObject = object,
            TLengthField extends KeyOfType<TObject, number> = any,
            TEmptyBehavior extends EmptyBehavior = EmptyBehavior
            > extends BaseOptions {
            lengthField: TLengthField;

            emptyBehavior?: TEmptyBehavior;
        }

        export function getLengthBackingField(object: any, field: VariableLengthArray): number | undefined {
            return object[BackingField][field.options.lengthField];
        }

        export function setLengthBackingField(
            object: any,
            field: VariableLengthArray,
            value: number | undefined
        ) {
            object[BackingField][field.options.lengthField] = value;
        }

        export function initialize(
            object: any,
            field: VariableLengthArray,
            value: Array.BackingField,
            writer: StructWriter,
        ): void {
            Array.initialize(object, field, value);
            const descriptor = Object.getOwnPropertyDescriptor(object, field.name)!;
            delete object[field.name];

            switch (field.subType) {
                case Array.SubType.ArrayBuffer:
                    Object.defineProperty(object, field.name, {
                        ...descriptor,
                        set(buffer: ArrayBuffer | undefined) {
                            descriptor.set!.call(object, buffer);
                            setLengthBackingField(object, field, buffer?.byteLength ?? 0);
                        },
                    });

                    delete object[field.options.lengthField];
                    Object.defineProperty(object, field.options.lengthField, {
                        configurable: true,
                        enumerable: true,
                        get() {
                            return getLengthBackingField(object, field);
                        }
                    });
                    break;
                case Array.SubType.String:
                    Object.defineProperty(object, field.name, {
                        ...descriptor,
                        set(string: string | undefined) {
                            descriptor.set!.call(object, string);
                            if (string) {
                                setLengthBackingField(object, field, undefined);
                            } else {
                                setLengthBackingField(object, field, 0);
                            }
                        },
                    });

                    delete object[field.options.lengthField];
                    Object.defineProperty(object, field.options.lengthField, {
                        configurable: true,
                        enumerable: true,
                        get() {
                            let value = getLengthBackingField(object, field);
                            if (value === undefined) {
                                const backingField = Array.getBackingField(object, field.name);
                                const buffer = writer.encodeUtf8(backingField.string!);
                                backingField.buffer = buffer;

                                value = buffer.byteLength;
                                setLengthBackingField(object, field, value);
                            }
                            return value;
                        }
                    });
                    break;
                default:
                    throw new Error('Unknown type');
            }
            Array.setBackingField(object, field.name, value);
            if (value.buffer) {
                setLengthBackingField(object, field, value.buffer.byteLength);
            }
        }
    }

    registerType(undefined as unknown as VariableLengthArray, {
        type: Type.VariableLengthArray,

        getLength() { return 0; },

        async parse({ field, object, reader }) {
            const value: Array.BackingField = {};
            const length = object[field.options.lengthField];
            if (length === 0) {
                if (field.options.emptyBehavior === VariableLengthArray.EmptyBehavior.Empty) {
                    value.buffer = new ArrayBuffer(0);
                    value.string = '';
                }

                VariableLengthArray.initialize(object, field, value, reader);
                return;
            }

            value.buffer = await reader.read(length);
            switch (field.subType) {
                case Array.SubType.ArrayBuffer:
                    break;
                case Array.SubType.String:
                    value.string = reader.decodeUtf8(value.buffer);
                    break;
                default:
                    throw new Error('Unknown type');
            }
            VariableLengthArray.initialize(object, field, value, reader);
        },

        initialize({ field, init, object, writer }) {
            VariableLengthArray.initialize(object, field, {}, writer);
            object[field.name] = init[field.name];
        },

        getVariableLength({ field, object }) {
            return object[field.options.lengthField];
        },

        write({ dataView, field, object, offset }) {
            const backingField = Array.getBackingField(object, field.name);
            new Uint8Array(dataView.buffer).set(
                new Uint8Array(backingField.buffer!),
                offset
            );
        },
    });

    export interface VariableLengthArray<
        TType extends Array.SubType = Array.SubType,
        TObject = object,
        TLengthField extends VariableLengthArray.KeyOfType<TObject, number> = any,
        TEmptyBehavior extends VariableLengthArray.EmptyBehavior = VariableLengthArray.EmptyBehavior,
        TOptions extends VariableLengthArray.Options<TObject, TLengthField, TEmptyBehavior> = VariableLengthArray.Options<TObject, TLengthField, TEmptyBehavior>
        > extends Array<TType, TOptions> {
        type: Type.VariableLengthArray;

        options: TOptions;
    }

    export type Any =
        Number |
        FixedLengthArray |
        VariableLengthArray;
}

export interface StructWriter {
    encodeUtf8(input: string): ArrayBuffer;
}

export interface StructReader extends StructWriter {
    decodeUtf8(buffer: ArrayBuffer): string;

    read(length: number): Promise<ArrayBuffer>;
}

export type StructValueType<T extends Struct<unknown, unknown, unknown>> =
    T extends { parse(reader: StructReader): Promise<infer R>; } ? R : never;

export type StructInitType<T extends Struct<unknown, unknown, unknown>> =
    T extends { create(value: infer R, ...args: any): any; } ? R : never;

export interface StructOptions {
    littleEndian: boolean;
}

export const StructDefaultOptions: Readonly<StructOptions> = {
    littleEndian: false,
};

interface ArrayInitializer<TObject, TAfterParsed, TInit> {
    <
        TName extends PropertyKey,
        TType extends StructField.Array.SubType,
        TTypeScriptType = StructField.Array.TypeScriptType<TType>
        >(
        name: TName,
        type: TType,
        options: StructField.FixedLengthArray.Options,
        typescriptType?: () => TTypeScriptType,
    ): Struct<
        TObject & Record<TName, TTypeScriptType>,
        TAfterParsed,
        TInit & Record<TName, TTypeScriptType>
    >;

    <
        TName extends PropertyKey,
        TType extends StructField.Array.SubType,
        TLengthField extends StructField.VariableLengthArray.KeyOfType<TInit, number>,
        TEmptyBehavior extends StructField.VariableLengthArray.EmptyBehavior,
        TTypeScriptType = StructField.VariableLengthArray.TypeScriptType<TType, TEmptyBehavior>
        >(
        name: TName,
        type: TType,
        options: StructField.VariableLengthArray.Options<TInit, TLengthField, TEmptyBehavior>,
        typescriptType?: () => TTypeScriptType,
    ): Struct<
        TObject & Record<TName, TTypeScriptType>,
        TAfterParsed,
        Omit<TInit, TLengthField> & Record<TName, TTypeScriptType>
    >;
}

interface ArrayTypeInitializer<
    TObject,
    TAfterParsed,
    TInit,
    TType extends StructField.Array.SubType
    > {
    <
        TName extends PropertyKey,
        TTypeScriptType = StructField.Array.TypeScriptType<TType>
        >(
        name: TName,
        options: StructField.FixedLengthArray.Options,
        typescriptType?: () => TTypeScriptType,
    ): Struct<
        TObject & Record<TName, TTypeScriptType>,
        TAfterParsed,
        TInit & Record<TName, TTypeScriptType>
    >;

    <
        TName extends PropertyKey,
        TLengthField extends StructField.VariableLengthArray.KeyOfType<TInit, number>,
        TEmptyBehavior extends StructField.VariableLengthArray.EmptyBehavior,
        TTypeScriptType = StructField.VariableLengthArray.TypeScriptType<TType, TEmptyBehavior>
        >(
        name: TName,
        options: StructField.VariableLengthArray.Options<TInit, TLengthField, TEmptyBehavior>,
        _typescriptType?: () => TTypeScriptType,
    ): Struct<
        TObject & Record<TName, TTypeScriptType>,
        TAfterParsed,
        Omit<TInit, TLengthField> & Record<TName, TTypeScriptType>
    >;
}

export type StructAfterParsed<TObject, TResult> =
    (this: TObject, object: TObject) => TResult;

export default class Struct<TObject = {}, TAfterParsed = undefined, TInit = {}> {
    public readonly options: Readonly<StructOptions>;

    private _size = 0;
    public get size() { return this._size; }

    private fields: StructField.Any[] = [];

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

    private number<
        TName extends PropertyKey,
        TTypeScriptType = StructField.Number.TypeScriptType
    >(
        name: TName,
        type: StructField.Number.SubType,
        options: StructField.BaseOptions = {},
        _typescriptType?: () => TTypeScriptType,
    ): Struct<
        TObject & Record<TName, TTypeScriptType>,
        TAfterParsed,
        TInit & Record<TName, TTypeScriptType>
    > {
        const result = this.clone();
        result.fields.push({
            type: StructField.Type.Number,
            name,
            subType: type,
            options,
        });
        result._size += StructField.Number.SizeMap[type];
        return result;
    }

    public int32<
        TName extends PropertyKey,
        TTypeScriptType = StructField.Number.TypeScriptType
    >(
        name: TName,
        options?: StructField.BaseOptions,
        _typescriptType?: () => TTypeScriptType,
    ): Struct<
        TObject & Record<TName, TTypeScriptType>,
        TAfterParsed,
        TInit & Record<TName, TTypeScriptType>
    > {
        return this.number(
            name,
            StructField.Number.SubType.Int32,
            options,
            _typescriptType
        );
    }

    public uint32<
        TName extends PropertyKey,
        TTypeScriptType = StructField.Number.TypeScriptType
    >(
        name: TName,
        options?: StructField.BaseOptions,
        _typescriptType?: () => TTypeScriptType,
    ): Struct<
        TObject & Record<TName, TTypeScriptType>,
        TAfterParsed,
        TInit & Record<TName, TTypeScriptType>
    > {
        return this.number(
            name,
            StructField.Number.SubType.Uint32,
            options,
            _typescriptType
        );
    }

    private array: ArrayInitializer<TObject, TAfterParsed, TInit> = (
        name: PropertyKey,
        type: StructField.Array.SubType,
        options: StructField.FixedLengthArray.Options | StructField.VariableLengthArray.Options
    ): Struct<any, any, any> => {
        const result = this.clone();
        if ('length' in options) {
            result.fields.push({
                type: StructField.Type.FixedLengthArray,
                name,
                subType: type,
                options: options,
            });
            result._size += options.length;
        } else {
            result.fields.push({
                type: StructField.Type.VariableLengthArray,
                name,
                subType: type,
                options: options,
            });
        }
        return result;
    };

    public arrayBuffer: ArrayTypeInitializer<
        TObject,
        TAfterParsed,
        TInit,
        StructField.Array.SubType.ArrayBuffer
    > = (
        name: PropertyKey,
        options: any
    ) => {
            return this.array(name, StructField.Array.SubType.ArrayBuffer, options);
        };

    public string: ArrayTypeInitializer<
        TObject,
        TAfterParsed,
        TInit,
        StructField.Array.SubType.String
    > = (
        name: PropertyKey,
        options: any
    ) => {
            return this.array(name, StructField.Array.SubType.String, options);
        };

    public extra<U extends object>(
        value: U & ThisType<Omit<TObject, keyof U> & U>
    ): Struct<Omit<TObject, keyof U> & U, TAfterParsed, TInit> {
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

    public create(init: TInit, writer: StructWriter): TObject {
        const object: any = {
            [BackingField]: {},
        };

        for (const field of this.fields) {
            const type = StructField.getType(field.type);
            if (type.initialize) {
                type.initialize({
                    field,
                    init,
                    object,
                    options: this.options,
                    writer,
                });
            } else {
                object[field.name] = (init as any)[field.name];
            }
        }

        Object.defineProperties(object, this._extra);
        return object;
    }

    public async parse(
        reader: StructReader
    ): Promise<TAfterParsed extends undefined ? TObject : TAfterParsed> {
        const object: any = {
            [BackingField]: {},
        };

        for (const field of this.fields) {
            await StructField.getType(field.type).parse({
                reader,
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

    public toBuffer(init: TInit, writer: StructWriter): ArrayBuffer {
        const object = this.create(init, writer) as any;

        let size = this._size;
        let fieldSize: number[] = [];
        for (let i = 0; i < this.fields.length; i++) {
            const field = this.fields[i];
            const type = StructField.getType(field.type);
            if (type.getVariableLength) {
                fieldSize[i] = type.getVariableLength({
                    writer,
                    field,
                    object,
                    options: this.options,
                });
                size += fieldSize[i];
            } else {
                fieldSize[i] = type.getLength({ field, options: this.options });
            }
        }

        const buffer = new ArrayBuffer(size);
        const dataView = new DataView(buffer);
        let offset = 0;
        for (let i = 0; i < this.fields.length; i++) {
            const field = this.fields[i];
            const type = StructField.getType(field.type);
            type.write({
                dataView,
                field,
                object,
                offset,
                options: this.options,
                writer,
            });
            offset += fieldSize[i];
        }
        return buffer;
    }
}
