import type {
    AsyncExactReadable,
    ExactReadable,
    StructOptions,
    StructValue,
} from "../basic/index.js";
import { StructFieldDefinition, StructFieldValue } from "../basic/index.js";
import { SyncPromise } from "../sync-promise.js";
import type { ValueOrPromise } from "../utils.js";

export interface NumberFieldType {
    signed: boolean;
    size: number;
    deserialize(array: Uint8Array, littleEndian: boolean): number;
    serialize(
        dataView: DataView,
        offset: number,
        value: number,
        littleEndian: boolean
    ): void;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace NumberFieldType {
    export const Uint8: NumberFieldType = {
        signed: false,
        size: 1,
        deserialize(array) {
            return array[0]!;
        },
        serialize(dataView, offset, value) {
            dataView.setUint8(offset, value);
        },
    };

    export const Int8: NumberFieldType = {
        signed: true,
        size: 1,
        deserialize(array) {
            const value = Uint8.deserialize(array, false);
            return (value << 24) >> 24;
        },
        serialize(dataView, offset, value) {
            dataView.setInt8(offset, value);
        },
    };

    export const Uint16: NumberFieldType = {
        signed: false,
        size: 2,
        deserialize(array, littleEndian) {
            // PERF: Creating many `DataView`s over small buffers is 90% slower
            // than this. Even if the `DataView` is cached, `DataView#getUint16`
            // is still 1% slower than this.
            const a = (array[1]! << 8) | array[0]!;
            const b = (array[0]! << 8) | array[1]!;
            return littleEndian ? a : b;
        },
        serialize(dataView, offset, value, littleEndian) {
            dataView.setUint16(offset, value, littleEndian);
        },
    };

    export const Int16: NumberFieldType = {
        signed: true,
        size: 2,
        deserialize(array, littleEndian) {
            const value = Uint16.deserialize(array, littleEndian);
            return (value << 16) >> 16;
        },
        serialize(dataView, offset, value, littleEndian) {
            dataView.setInt16(offset, value, littleEndian);
        },
    };

    export const Uint32: NumberFieldType = {
        signed: false,
        size: 4,
        deserialize(array, littleEndian) {
            const value = Int32.deserialize(array, littleEndian);
            return value >>> 0;
        },
        serialize(dataView, offset, value, littleEndian) {
            dataView.setUint32(offset, value, littleEndian);
        },
    };

    export const Int32: NumberFieldType = {
        signed: true,
        size: 4,
        deserialize(array, littleEndian) {
            const a =
                (array[3]! << 24) |
                (array[2]! << 16) |
                (array[1]! << 8) |
                array[0]!;
            const b =
                (array[0]! << 24) |
                (array[1]! << 16) |
                (array[2]! << 8) |
                array[3]!;
            return littleEndian ? a : b;
        },
        serialize(dataView, offset, value, littleEndian) {
            dataView.setInt32(offset, value, littleEndian);
        },
    };
}

export class NumberFieldDefinition<
    TType extends NumberFieldType = NumberFieldType,
    TTypeScriptType = number
> extends StructFieldDefinition<void, TTypeScriptType> {
    public readonly type: TType;

    public constructor(type: TType, typescriptType?: TTypeScriptType) {
        void typescriptType;
        super();
        this.type = type;
    }

    public getSize(): number {
        return this.type.size;
    }

    public create(
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TTypeScriptType
    ): NumberFieldValue<this> {
        return new NumberFieldValue(this, options, struct, value);
    }

    public override deserialize(
        options: Readonly<StructOptions>,
        stream: ExactReadable,
        struct: StructValue
    ): NumberFieldValue<this>;
    public override deserialize(
        options: Readonly<StructOptions>,
        stream: AsyncExactReadable,
        struct: StructValue
    ): Promise<NumberFieldValue<this>>;
    public override deserialize(
        options: Readonly<StructOptions>,
        stream: ExactReadable | AsyncExactReadable,
        struct: StructValue
    ): ValueOrPromise<NumberFieldValue<this>> {
        return SyncPromise.try(() => {
            return stream.readExactly(this.getSize());
        })
            .then((array) => {
                const value = this.type.deserialize(
                    array,
                    options.littleEndian
                );
                return this.create(options, struct, value as any);
            })
            .valueOrPromise();
    }
}

export class NumberFieldValue<
    TDefinition extends NumberFieldDefinition<NumberFieldType, any>
> extends StructFieldValue<TDefinition> {
    public serialize(dataView: DataView, offset: number): void {
        this.definition.type.serialize(
            dataView,
            offset,
            this.value,
            this.options.littleEndian
        );
    }
}
