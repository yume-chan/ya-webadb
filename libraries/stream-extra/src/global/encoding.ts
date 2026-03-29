import type { TransformStream } from "./streams.js";
import { getGlobalValue } from "./utils.js";

export interface TextDecoderOptions {
    fatal?: boolean;
    ignoreBOM?: boolean;
}

export interface TextDecoderStream extends TransformStream<
    ArrayBufferView | ArrayBufferLike,
    string
> {
    readonly encoding: string;
    readonly fatal: boolean;
    readonly ignoreBOM: boolean;
}

interface TextDecoderStreamConstructor {
    prototype: TextDecoderStream;
    new (label?: string, options?: TextDecoderOptions): TextDecoderStream;
}

export const TextDecoderStream =
    getGlobalValue<TextDecoderStreamConstructor>("TextDecoderStream");

export interface TextEncoderStream extends TransformStream<string, Uint8Array> {
    readonly encoding: string;
}

interface TextEncoderStreamConstructor {
    prototype: TextEncoderStream;
    new (label?: string): TextEncoderStream;
}

export const TextEncoderStream =
    getGlobalValue<TextEncoderStreamConstructor>("TextEncoderStream");
