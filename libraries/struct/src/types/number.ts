import { StructFieldDefinition, StructFieldValue, StructValue, type StructAsyncDeserializeStream, type StructDeserializeStream, type StructOptions } from '../basic/index.js';
import { SyncPromise } from "../sync-promise.js";
import type { ValueOrPromise } from "../utils.js";

type NumberTypeDeserializer = (array: Uint8Array, littleEndian: boolean) => number;

const DESERIALIZERS: Record<number, NumberTypeDeserializer> = {
    1: (array, littleEndian) =>
        array[0]!,
    2: (array, littleEndian) =>
        ((array[1]! << 8) | array[0]!) * (littleEndian as any) |
        ((array[0]! << 8) | array[1]!) * (!littleEndian as any),
    4: (array, littleEndian) =>
        ((array[3]! << 24) | (array[2]! << 16) | (array[1]! << 8) | array[0]!) * (littleEndian as any) |
        ((array[0]! << 24) | (array[1]! << 16) | (array[2]! << 8) | array[3]!) * (!littleEndian as any),
};

export type DataViewSetters =
    { [TKey in keyof DataView]: TKey extends `set${string}` ? TKey : never }[keyof DataView];

export class NumberFieldType {
    public readonly TTypeScriptType!: number;

    public readonly signed: boolean;

    public readonly size: number;

    public readonly deserializer: NumberTypeDeserializer;
    public readonly convertSign: (value: number) => number;

    public readonly dataViewSetter: DataViewSetters;

    public constructor(
        size: number,
        signed: boolean,
        convertSign: (value: number) => number,
        dataViewSetter: DataViewSetters
    ) {
        this.size = size;
        this.signed = signed;
        this.deserializer = DESERIALIZERS[size]!;
        this.convertSign = convertSign;
        this.dataViewSetter = dataViewSetter;
    }

    public static readonly Int8 = new NumberFieldType(1, true, value => value << 24 >> 24, 'setInt8');

    public static readonly Uint8 = new NumberFieldType(1, false, value => value, 'setUint8');

    public static readonly Int16 = new NumberFieldType(2, true, value => value << 16 >> 16, 'setInt16');

    public static readonly Uint16 = new NumberFieldType(2, false, value => value, 'setUint16');

    public static readonly Int32 = new NumberFieldType(4, true, value => value, 'setInt32');

    public static readonly Uint32 = new NumberFieldType(4, false, value => value >>> 0, 'setUint32');
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
        return SyncPromise
            .try(() => {
                return stream.read(this.getSize());
            })
            .then(array => {
                let value: number;
                value = this.type.deserializer(array, options.littleEndian);
                value = this.type.convertSign(value);
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
