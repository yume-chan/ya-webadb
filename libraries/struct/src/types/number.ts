import { StructDeserializationContext, StructFieldDefinition, StructFieldValue, StructOptions, StructSerializationContext, StructValue } from '../basic';

export type DataViewGetters =
    { [TKey in keyof DataView]: TKey extends `get${string}` ? TKey : never }[keyof DataView];

export type DataViewSetters =
    { [TKey in keyof DataView]: TKey extends `set${string}` ? TKey : never }[keyof DataView];

export class NumberFieldType<TTypeScriptType extends number | bigint = number | bigint> {
    readonly TTypeScriptType!: TTypeScriptType;

    readonly size: number;

    readonly dataViewGetter: DataViewGetters;

    readonly dataViewSetter: DataViewSetters;

    constructor(
        size: number,
        dataViewGetter: DataViewGetters,
        dataViewSetter: DataViewSetters
    ) {
        this.size = size;
        this.dataViewGetter = dataViewGetter;
        this.dataViewSetter = dataViewSetter;
    }

    static readonly Int8 = new NumberFieldType<number>(1, 'getInt8', 'setInt8');

    static readonly Uint8 = new NumberFieldType<number>(1, 'getUint8', 'setUint8');

    static readonly Int16 = new NumberFieldType<number>(2, 'getInt16', 'setInt16');

    static readonly Uint16 = new NumberFieldType<number>(2, 'getUint16', 'setUint16');

    static readonly Int32 = new NumberFieldType<number>(4, 'getInt32', 'setInt32');

    static readonly Uint32 = new NumberFieldType<number>(4, 'getUint32', 'setUint32');

    static readonly Int64 = new NumberFieldType<bigint>(8, 'getBigInt64', 'setBigInt64');

    static readonly Uint64 = new NumberFieldType<bigint>(8, 'getBigUint64', 'setBigUint64');
}

export class NumberFieldDefinition<
    TType extends NumberFieldType = NumberFieldType,
    TTypeScriptType = TType['TTypeScriptType'],
    > extends StructFieldDefinition<
    void,
    TTypeScriptType
    > {
    readonly type: TType;

    constructor(type: TType, _typescriptType?: TTypeScriptType) {
        super();
        this.type = type;
    }

    getSize(): number {
        return this.type.size;
    }

    create(
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        struct: StructValue,
        value: TTypeScriptType,
    ): NumberFieldValue<this> {
        return new NumberFieldValue(this, options, context, struct, value);
    }

    async deserialize(
        options: Readonly<StructOptions>,
        context: StructDeserializationContext,
        struct: StructValue,
    ): Promise<NumberFieldValue<this>> {
        const buffer = await context.read(this.getSize());
        const view = new DataView(buffer);
        const value = view[this.type.dataViewGetter](
            0,
            options.littleEndian
        ) as any;
        return this.create(options, context, struct, value);
    }
}

export class NumberFieldValue<
    TDefinition extends NumberFieldDefinition<NumberFieldType, any>,
    > extends StructFieldValue<TDefinition> {
    serialize(dataView: DataView, offset: number): void {
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
