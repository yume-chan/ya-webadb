// cspell: ignore syncbird

import { StructAsyncDeserializeStream, StructDeserializeStream, StructFieldDefinition, StructFieldValue, StructOptions, StructValue } from '../basic';
import { Syncbird } from "../syncbird";
import type { ValueOrPromise } from "../utils";

export type DataViewGetters =
    { [TKey in keyof DataView]: TKey extends `get${string}` ? TKey : never }[keyof DataView];

export type DataViewSetters =
    { [TKey in keyof DataView]: TKey extends `set${string}` ? TKey : never }[keyof DataView];

export class NumberFieldType {
    public readonly TTypeScriptType!: number;

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

    public static readonly Int8 = new NumberFieldType(1, 'getInt8', 'setInt8');

    public static readonly Uint8 = new NumberFieldType(1, 'getUint8', 'setUint8');

    public static readonly Int16 = new NumberFieldType(2, 'getInt16', 'setInt16');

    public static readonly Uint16 = new NumberFieldType(2, 'getUint16', 'setUint16');

    public static readonly Int32 = new NumberFieldType(4, 'getInt32', 'setInt32');

    public static readonly Uint32 = new NumberFieldType(4, 'getUint32', 'setUint32');
}

export class NumberFieldDefinition<
    TType extends NumberFieldType = NumberFieldType,
    TTypeScriptType = TType["TTypeScriptType"],
    > extends StructFieldDefinition<
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

    public create(
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TTypeScriptType,
    ): NumberFieldValue<this> {
        return new NumberFieldValue(this, options, struct, value);
    }

    public override deserialize(
        options: Readonly<StructOptions>,
        stream: StructDeserializeStream,
        struct: StructValue,
    ): NumberFieldValue<this>;
    public override deserialize(
        options: Readonly<StructOptions>,
        stream: StructAsyncDeserializeStream,
        struct: StructValue,
    ): Promise<NumberFieldValue<this>>;
    public override deserialize(
        options: Readonly<StructOptions>,
        stream: StructDeserializeStream | StructAsyncDeserializeStream,
        struct: StructValue,
    ): ValueOrPromise<NumberFieldValue<this>> {
        return Syncbird
            .try(() => {
                return stream.read(this.getSize());
            })
            .then(array => {
                const view = new DataView(array.buffer, array.byteOffset, array.byteLength);
                const value = view[this.type.dataViewGetter](
                    0,
                    options.littleEndian
                );
                return this.create(options, struct, value as any);
            })
            .valueOrPromise();
    }
}

export class NumberFieldValue<
    TDefinition extends NumberFieldDefinition<NumberFieldType, any>,
    > extends StructFieldValue<TDefinition> {
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
