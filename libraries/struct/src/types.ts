import type { MaybePromiseLike } from "@yume-chan/async";

import type { AsyncExactReadable, ExactReadable } from "./readable.js";

export interface FieldDefaultSerializeContext {
    littleEndian: boolean;
}

export interface StructSerializeContext {
    buffer: Uint8Array;
    index?: number;
}

export interface FieldByobSerializeContext
    extends FieldDefaultSerializeContext,
        StructSerializeContext {}

export interface FieldSerializer<T> {
    type: "default" | "byob";
    size: number;

    serialize(source: T, context: FieldDefaultSerializeContext): Uint8Array;
    serialize(source: T, context: FieldByobSerializeContext): number;
}

export interface StructSerializer<T> extends FieldSerializer<T> {
    type: "byob";
    size: number;

    serialize(source: T): Uint8Array;
    serialize(source: T, buffer: Uint8Array): number;
    serialize(source: T, context: StructSerializeContext): number;
}

export type StructInit<T extends StructSerializer<unknown>> =
    T extends StructSerializer<infer U> ? U : never;

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

export interface StructDeserializer<T> extends FieldDeserializer<T, never> {
    size: number;

    deserialize(reader: ExactReadable): T;
    deserialize(reader: AsyncExactReadable): MaybePromiseLike<T>;
}

export type StructValue<T extends StructDeserializer<unknown>> =
    T extends StructDeserializer<infer P> ? P : never;
