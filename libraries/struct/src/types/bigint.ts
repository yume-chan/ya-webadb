import {
    getBigInt64,
    getBigUint64,
    setBigInt64,
    setBigUint64,
} from "@yume-chan/dataview-bigint-polyfill/esm/fallback.js";

import type {
    AsyncExactReadable,
    ExactReadable,
    StructOptions,
    StructValue,
} from "../basic/index.js";
import { StructFieldDefinition, StructFieldValue } from "../basic/index.js";
import { SyncPromise } from "../sync-promise.js";
import type { ValueOrPromise } from "../utils.js";

type DataViewBigInt64Getter = (
    dataView: DataView,
    byteOffset: number,
    littleEndian: boolean | undefined,
) => bigint;

type DataViewBigInt64Setter = (
    dataView: DataView,
    byteOffset: number,
    value: bigint,
    littleEndian: boolean | undefined,
) => void;

export class BigIntFieldType {
    readonly TTypeScriptType!: bigint;

    readonly size: number;

    readonly getter: DataViewBigInt64Getter;

    readonly setter: DataViewBigInt64Setter;

    constructor(
        size: number,
        getter: DataViewBigInt64Getter,
        setter: DataViewBigInt64Setter,
    ) {
        this.size = size;
        this.getter = getter;
        this.setter = setter;
    }

    static readonly Int64 = new BigIntFieldType(8, getBigInt64, setBigInt64);

    static readonly Uint64 = new BigIntFieldType(8, getBigUint64, setBigUint64);
}

export class BigIntFieldDefinition<
    TType extends BigIntFieldType = BigIntFieldType,
    TTypeScriptType = TType["TTypeScriptType"],
> extends StructFieldDefinition<void, TTypeScriptType> {
    readonly type: TType;

    constructor(type: TType, typescriptType?: TTypeScriptType) {
        void typescriptType;
        super();
        this.type = type;
    }

    getSize(): number {
        return this.type.size;
    }

    create(
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TTypeScriptType,
    ): BigIntFieldValue<this> {
        return new BigIntFieldValue(this, options, struct, value);
    }

    override deserialize(
        options: Readonly<StructOptions>,
        stream: ExactReadable,
        struct: StructValue,
    ): BigIntFieldValue<this>;
    override deserialize(
        options: Readonly<StructOptions>,
        stream: AsyncExactReadable,
        struct: StructValue,
    ): Promise<BigIntFieldValue<this>>;
    override deserialize(
        options: Readonly<StructOptions>,
        stream: ExactReadable | AsyncExactReadable,
        struct: StructValue,
    ): ValueOrPromise<BigIntFieldValue<this>> {
        return SyncPromise.try(() => {
            return stream.readExactly(this.getSize());
        })
            .then((array) => {
                const view = new DataView(
                    array.buffer,
                    array.byteOffset,
                    array.byteLength,
                );
                const value = this.type.getter(view, 0, options.littleEndian);
                return this.create(options, struct, value as any);
            })
            .valueOrPromise();
    }
}

export class BigIntFieldValue<
    TDefinition extends BigIntFieldDefinition<BigIntFieldType, any>,
> extends StructFieldValue<TDefinition> {
    serialize(dataView: DataView, offset: number): void {
        this.definition.type.setter(
            dataView,
            offset,
            this.value,
            this.options.littleEndian,
        );
    }
}
