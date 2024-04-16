import {
    getInt64,
    getUint64,
    setInt64,
    setUint64,
} from "@yume-chan/no-data-view";
import type {
    AsyncExactReadable,
    ExactReadable,
    StructOptions,
    StructValue,
} from "../basic/index.js";
import { StructFieldDefinition, StructFieldValue } from "../basic/index.js";
import { SyncPromise } from "../sync-promise.js";
import type { ValueOrPromise } from "../utils.js";

type GetBigInt64 = (
    array: Uint8Array,
    byteOffset: number,
    littleEndian: boolean,
) => bigint;

type SetBigInt64 = (
    array: Uint8Array,
    byteOffset: number,
    value: bigint,
    littleEndian: boolean,
) => void;

export class BigIntFieldType {
    readonly TTypeScriptType!: bigint;

    readonly size: number;

    readonly getter: GetBigInt64;

    readonly setter: SetBigInt64;

    constructor(size: number, getter: GetBigInt64, setter: SetBigInt64) {
        this.size = size;
        this.getter = getter;
        this.setter = setter;
    }

    static readonly Int64 = new BigIntFieldType(8, getInt64, setInt64);

    static readonly Uint64 = new BigIntFieldType(8, getUint64, setUint64);
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
                const value = this.type.getter(array, 0, options.littleEndian);
                return this.create(options, struct, value as never);
            })
            .valueOrPromise();
    }
}

export class BigIntFieldValue<
    TDefinition extends BigIntFieldDefinition<BigIntFieldType, unknown>,
> extends StructFieldValue<TDefinition> {
    override serialize(
        dataView: DataView,
        array: Uint8Array,
        offset: number,
    ): void {
        this.definition.type.setter(
            array,
            offset,
            this.value as never,
            this.options.littleEndian,
        );
    }
}
