import {
    getInt16,
    getInt32,
    getInt8,
    getUint16,
    getUint32,
    setInt16,
    setInt32,
    setUint16,
    setUint32,
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

export interface NumberFieldVariant {
    signed: boolean;
    size: number;
    deserialize(array: Uint8Array, littleEndian: boolean): number;
    serialize(
        array: Uint8Array,
        offset: number,
        value: number,
        littleEndian: boolean,
    ): void;
}

export namespace NumberFieldVariant {
    export const Uint8: NumberFieldVariant = {
        signed: false,
        size: 1,
        deserialize(array) {
            return array[0]!;
        },
        serialize(array, offset, value) {
            array[offset] = value;
        },
    };

    export const Int8: NumberFieldVariant = {
        signed: true,
        size: 1,
        deserialize(array) {
            return getInt8(array, 0);
        },
        serialize(array, offset, value) {
            array[offset] = value;
        },
    };

    export const Uint16: NumberFieldVariant = {
        signed: false,
        size: 2,
        deserialize(array, littleEndian) {
            return getUint16(array, 0, littleEndian);
        },
        serialize: setUint16,
    };

    export const Int16: NumberFieldVariant = {
        signed: true,
        size: 2,
        deserialize(array, littleEndian) {
            return getInt16(array, 0, littleEndian);
        },
        serialize: setInt16,
    };

    export const Uint32: NumberFieldVariant = {
        signed: false,
        size: 4,
        deserialize(array, littleEndian) {
            return getUint32(array, 0, littleEndian);
        },
        serialize: setUint32,
    };

    export const Int32: NumberFieldVariant = {
        signed: true,
        size: 4,
        deserialize(array, littleEndian) {
            return getInt32(array, 0, littleEndian);
        },
        serialize: setInt32,
    };
}

export class NumberFieldDefinition<
    TVariant extends NumberFieldVariant = NumberFieldVariant,
    TTypeScriptType = number,
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
    ): NumberFieldValue<this> {
        return new NumberFieldValue(this, options, struct, value);
    }

    override deserialize(
        options: Readonly<StructOptions>,
        stream: ExactReadable,
        struct: StructValue,
    ): NumberFieldValue<this>;
    override deserialize(
        options: Readonly<StructOptions>,
        stream: AsyncExactReadable,
        struct: StructValue,
    ): Promise<NumberFieldValue<this>>;
    override deserialize(
        options: Readonly<StructOptions>,
        stream: ExactReadable | AsyncExactReadable,
        struct: StructValue,
    ): ValueOrPromise<NumberFieldValue<this>> {
        return SyncPromise.try(() => {
            return stream.readExactly(this.getSize());
        })
            .then((array) => {
                const value = this.variant.deserialize(
                    array,
                    options.littleEndian,
                );
                return this.create(options, struct, value as never);
            })
            .valueOrPromise();
    }
}

export class NumberFieldValue<
    TDefinition extends NumberFieldDefinition<NumberFieldVariant, unknown>,
> extends StructFieldValue<TDefinition> {
    serialize(array: Uint8Array, offset: number): void {
        this.definition.variant.serialize(
            array,
            offset,
            this.value as never,
            this.options.littleEndian,
        );
    }
}
