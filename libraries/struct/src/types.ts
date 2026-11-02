import type { MaybePromiseLike } from "@yume-chan/async";

import type {
    FieldByobSerializeContext,
    FieldDeserializer,
    FieldSerializer,
} from "./field/index.js";
import type { AsyncExactReadable, ExactReadable } from "./readable.js";

export type StructSerializeContext = Omit<
    FieldByobSerializeContext,
    "littleEndian"
>;

export interface StructSerializer<T> extends FieldSerializer<T> {
    serialize(source: T): Uint8Array;
    serialize(source: T, buffer: Uint8Array): number;
    serialize(source: T, context: StructSerializeContext): number;
}

export type StructInit<T extends StructSerializer<unknown>> =
    T extends StructSerializer<infer U> ? U : never;

export interface StructDeserializer<T> extends FieldDeserializer<T, never> {
    size: number;

    deserialize(reader: ExactReadable): T;
    deserialize(reader: AsyncExactReadable): MaybePromiseLike<T>;
}

export type StructValue<T extends StructDeserializer<unknown>> =
    T extends StructDeserializer<infer P> ? P : never;

export type StructLike<T> = StructSerializer<T> & StructDeserializer<T>;
