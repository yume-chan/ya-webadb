import { BuiltInFieldType, FieldDescriptorBase, FieldDescriptorBaseOptions, FieldRuntimeValue, GlobalStructFieldRuntimeTypeRegistry, StructDeserializationContext } from '../runtime';

export type DataViewGetters =
    { [TKey in keyof DataView]: TKey extends `get${string}` ? TKey : never }[keyof DataView];

export type DataViewSetters =
    { [TKey in keyof DataView]: TKey extends `set${string}` ? TKey : never }[keyof DataView];

export class NumberFieldSubType<TTypeScriptType extends number | bigint = number | bigint> {
    public static readonly Uint8 = new NumberFieldSubType<number>(1, 'getUint8', 'setUint8');

    public static readonly Uint16 = new NumberFieldSubType<number>(2, 'getUint16', 'setUint16');

    public static readonly Int32 = new NumberFieldSubType<number>(4, 'getInt32', 'setInt32');

    public static readonly Uint32 = new NumberFieldSubType<number>(4, 'getUint32', 'setUint32');

    public static readonly Int64 = new NumberFieldSubType<bigint>(8, 'getBigInt64', 'setBigInt64');

    public static readonly Uint64 = new NumberFieldSubType<bigint>(8, 'getBigUint64', 'setBigUint64');

    public readonly value!: TTypeScriptType;

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

export interface NumberFieldDescriptor<
    TName extends string = string,
    TSubType extends NumberFieldSubType<any> = NumberFieldSubType<any>,
    TTypeScriptType = TSubType['value'],
    TOptions extends FieldDescriptorBaseOptions = FieldDescriptorBaseOptions
    > extends FieldDescriptorBase<
    TName,
    Record<TName, TTypeScriptType>,
    Record<TName, TTypeScriptType>,
    TOptions
    > {
    type: BuiltInFieldType.Number;

    subType: TSubType;
}

export class NumberFieldRuntimeValue extends FieldRuntimeValue<NumberFieldDescriptor> {
    public static getSize(descriptor: NumberFieldDescriptor): number {
        return descriptor.subType.size;
    }

    protected value: number | bigint | undefined;

    public async deserialize(context: StructDeserializationContext): Promise<void> {
        const buffer = await context.read(this.getSize());
        const view = new DataView(buffer);
        this.value = view[this.descriptor.subType.dataViewGetter](
            0,
            this.options.littleEndian
        );
    }

    public get(): unknown {
        return this.value;
    }

    public set(value: unknown): void {
        this.value = value as number | bigint;
    }

    public serialize(dataView: DataView, offset: number): void {
        // `setBigInt64` requires a `bigint` while others require `number`
        // So `dataView[DataViewSetters]` requires `bigint & number`
        // and that is, `never`
        (dataView[this.descriptor.subType.dataViewSetter] as any)(
            offset,
            this.value!,
            this.options.littleEndian
        );
    }
}

GlobalStructFieldRuntimeTypeRegistry.register(
    BuiltInFieldType.Number,
    NumberFieldRuntimeValue,
);
