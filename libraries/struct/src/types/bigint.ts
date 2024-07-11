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

export type BigIntDeserializer = (
    array: Uint8Array,
    byteOffset: number,
    littleEndian: boolean,
) => bigint;

export type BigIntSerializer = (
    array: Uint8Array,
    byteOffset: number,
    value: bigint,
    littleEndian: boolean,
) => void;

export class BigIntFieldVariant {
    readonly TTypeScriptType!: bigint;

    readonly size: number;

    readonly deserialize: BigIntDeserializer;

    readonly serialize: BigIntSerializer;

    constructor(
        size: number,
        deserialize: BigIntDeserializer,
        serialize: BigIntSerializer,
    ) {
        this.size = size;
        this.deserialize = deserialize;
        this.serialize = serialize;
    }

    static readonly Int64 = new BigIntFieldVariant(8, getInt64, setInt64);

    static readonly Uint64 = new BigIntFieldVariant(8, getUint64, setUint64);
}

export class BigIntFieldDefinition<
    TVariant extends BigIntFieldVariant = BigIntFieldVariant,
    TTypeScriptType = TVariant["TTypeScriptType"],
> extends StructFieldDefinition<void, TTypeScriptType> {
    readonly variant: TVariant;

    constructor(variant: TVariant, typescriptType?: TTypeScriptType) {
        void typescriptType;
        super();
        this.variant = variant;
    }

    getSize(): number {
        return this.variant.size;
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
                const value = this.variant.deserialize(
                    array,
                    0,
                    options.littleEndian,
                );
                return this.create(options, struct, value as never);
            })
            .valueOrPromise();
    }
}

export class BigIntFieldValue<
    TDefinition extends BigIntFieldDefinition<BigIntFieldVariant, unknown>,
> extends StructFieldValue<TDefinition> {
    override serialize(array: Uint8Array, offset: number): void {
        this.definition.variant.serialize(
            array,
            offset,
            this.value as never,
            this.options.littleEndian,
        );
    }
}
