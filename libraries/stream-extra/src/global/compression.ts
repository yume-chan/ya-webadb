import type { TransformStream } from "./streams.js";
import { getGlobalValue } from "./utils.js";

export type CompressionStream = TransformStream<
    ArrayBufferView | ArrayBufferLike,
    Uint8Array<ArrayBuffer>
>;

interface CompressionStreamConstructor {
    prototype: CompressionStream;
    new (format: string): CompressionStream;
}

export const CompressionStream =
    getGlobalValue<CompressionStreamConstructor>("CompressionStream");

export type DecompressionStream = TransformStream<
    ArrayBufferView | ArrayBufferLike,
    Uint8Array<ArrayBuffer>
>;

interface DecompressionStreamConstructor {
    prototype: DecompressionStream;
    new (): DecompressionStream;
}

export const DecompressionStream =
    getGlobalValue<DecompressionStreamConstructor>("DecompressionStream");
