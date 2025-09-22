import type { MaybePromiseLike } from "@yume-chan/async";

import type { AsyncExactReadable, ExactReadable } from "../readable.js";

export interface FieldDefaultSerializeContext {
    littleEndian: boolean;
}

export interface FieldByobSerializeContext
    extends FieldDefaultSerializeContext {
    buffer: Uint8Array;
    index?: number;
}

export interface FieldSerializer<T> {
    type: "default" | "byob";
    size: number;

    serialize(source: T, context: FieldDefaultSerializeContext): Uint8Array;
    serialize(source: T, context: FieldByobSerializeContext): number;
}

export interface Field<T, OmitInit extends string, D, Raw = T>
    extends FieldSerializer<Raw>,
        FieldDeserializer<T, D> {
    omitInit: OmitInit | undefined;

    /**
     * A function to convert deserialized value back to raw value for serialization.
     */
    init?(value: T, dependencies: D): Raw;
}

export interface FieldDeserializeContext<D> {
    littleEndian: boolean;
    dependencies: D;
}

export interface FieldDeserializer<T, D> {
    deserialize(reader: ExactReadable, context: FieldDeserializeContext<D>): T;
    deserialize(
        reader: AsyncExactReadable,
        context: FieldDeserializeContext<D>,
    ): MaybePromiseLike<T>;
}

export interface FieldOptions<T, OmitInit extends string, D, Raw = T> {
    omitInit?: OmitInit;
    dependencies?: D;
    /**
     * A function to convert deserialized value back to raw value for serialization.
     */
    init?: ((value: T, dependencies: D) => Raw) | undefined;
}
