import type { TransformStream } from "./stream.js";

export interface TextDecoderOptions {
    fatal?: boolean;
    ignoreBOM?: boolean;
}

declare class TextDecoderStreamType extends TransformStream<
    ArrayBufferView | ArrayBuffer,
    string
> {
    constructor(label?: string, options?: TextDecoderOptions);

    readonly encoding: string;
    readonly fatal: boolean;
    readonly ignoreBOM: boolean;
}

declare class TextEncoderStreamType extends TransformStream<
    string,
    Uint8Array
> {
    constructor();

    readonly encoding: string;
}

interface GlobalExtension {
    TextDecoderStream: typeof TextDecoderStreamType;
    TextEncoderStream: typeof TextEncoderStreamType;
}

const Global = globalThis as unknown as GlobalExtension;

export const TextDecoderStream = Global.TextDecoderStream;
export type TextDecoderStream = TextDecoderStreamType;

export const TextEncoderStream = Global.TextEncoderStream;
export type TextEncoderStream = TextEncoderStreamType;
