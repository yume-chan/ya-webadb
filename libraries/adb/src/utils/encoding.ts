
// @ts-expect-error @types/node missing `TextEncoder`
const Utf8Encoder = new TextEncoder();
// @ts-expect-error @types/node missing `TextDecoder`
const Utf8Decoder = new TextDecoder();

export function encodeUtf8(input: string): Uint8Array {
    return Utf8Encoder.encode(input);
}

export function decodeUtf8(buffer: ArrayBufferView | ArrayBuffer): string {
    return Utf8Decoder.decode(buffer);
}
