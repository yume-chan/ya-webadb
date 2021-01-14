import { FieldDefinition, FieldRuntimeValue, StructDeserializationContext, StructOptions, StructSerializationContext } from '../basic';

export type DataViewGetters =
    { [TKey in keyof DataView]: TKey extends `get${string}` ? TKey : never }[keyof DataView];

export type DataViewSetters =
    { [TKey in keyof DataView]: TKey extends `set${string}` ? TKey : never }[keyof DataView];

export class NumberFieldType<TTypeScriptType extends number | bigint = number | bigint> {
    public static readonly Int8 = new NumberFieldType<number>(1, 'getInt8', 'setInt8');

    public static readonly Uint8 = new NumberFieldType<number>(1, 'getUint8', 'setUint8');

    public static readonly Int16 = new NumberFieldType<number>(2, 'getInt16', 'setInt16');

    public static readonly Uint16 = new NumberFieldType<number>(2, 'getUint16', 'setUint16');

    public static readonly Int32 = new NumberFieldType<number>(4, 'getInt32', 'setInt32');

    public static readonly Uint32 = new NumberFieldType<number>(4, 'getUint32', 'setUint32');

    public static readonly Int64 = new NumberFieldType<bigint>(8, 'getBigInt64', 'setBigInt64');

    public static readonly Uint64 = new NumberFieldType<bigint>(8, 'getBigUint64', 'setBigUint64');

    public readonly valueType!: TTypeScriptType;

    public readonly size: number;

    public readonly dataViewGetter: DataViewGetters;

    public readonly dataViewSetter: DataViewSetters;

    public constructor(
        size: number,
        dataViewGetter: DataViewGetters,
        dataViewSetter: DataViewSetters
    ) {
        this.size = size;
        this.dataViewGetter = dataViewGetter;
        this.dataViewSetter = dataViewSetter;
    }
}

export class NumberFieldDefinition<
    TType extends NumberFieldType = NumberFieldType,
    TTypeScriptType = TType['valueType'],
    > extends FieldDefinition<
    void,
    TTypeScriptType
    > {
    public readonly type: TType;

    public constructor(type: TType, _typescriptType?: TTypeScriptType) {
        super();
        this.type = type;
    }

    public getSize(): number {
        return this.type.size;
    }

    public async deserialize(
        options: Readonly<StructOptions>,
        context: StructDeserializationContext,
        object: any,
    ): Promise<NumberFieldRuntimeValue<TType, TTypeScriptType>> {
        const buffer = await context.read(this.getSize());
        const view = new DataView(buffer);
        const value = view[this.type.dataViewGetter](
            0,
            options.littleEndian
        ) as any;
        return this.createValue(options, context, object, value);
    }

    public createValue(
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        object: any,
        value: TTypeScriptType,
    ): NumberFieldRuntimeValue<TType, TTypeScriptType> {
        return new NumberFieldRuntimeValue(this, options, context, object, value);
    }
}

export class NumberFieldRuntimeValue<
    TType extends NumberFieldType = NumberFieldType,
    TTypeScriptType = TType['valueType'],
    > extends FieldRuntimeValue<NumberFieldDefinition<TType, TTypeScriptType>> {
    public serialize(dataView: DataView, offset: number): void {
        // `setBigInt64` requires a `bigint` while others require `number`
        // So `dataView[DataViewSetters]` requires `bigint & number`
        // and that is, `never`
        (dataView[this.definition.type.dataViewSetter] as any)(
            offset,
            this.value!,
            this.options.littleEndian
        );
    }
}
