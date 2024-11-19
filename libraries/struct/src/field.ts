import type { MaybePromiseLike } from "@yume-chan/async";

import type { AsyncExactReadable } from "./readable.js";

export interface SerializeContext {
    buffer: Uint8Array;
    index: number;
    littleEndian: boolean;
}

export interface DeserializeContext<S> {
    reader: AsyncExactReadable;
    littleEndian: boolean;
    runtimeStruct: S;
}

export interface Field<T, OmitInit extends string, S> {
    __invariant?: OmitInit;

    size: number;

    dynamicSize?(value: T): number;
    preSerialize?(value: T, runtimeStruct: S): void;
    serialize(value: T, context: SerializeContext): void;

    deserialize(context: DeserializeContext<S>): MaybePromiseLike<T>;
}
