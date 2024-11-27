// This library can't use `@types/node` or `lib: dom`
// because they will pollute the global scope
// So `TextEncoder` and `TextDecoder` types are not available

// Node.js 8.3 ships `TextEncoder` and `TextDecoder` in `util` module.
// But using top level await to load them requires Node.js 14.1.
// So there is no point to do that. Let's just assume they exist in global.

interface TextEncoder {
    encode(input: string): Uint8Array;
}

interface TextDecoder {
    decode(
        buffer?: ArrayBufferView | ArrayBuffer,
        options?: { stream?: boolean },
    ): string;
}

interface GlobalExtension {
    TextEncoder: new () => TextEncoder;
    TextDecoder: new () => TextDecoder;
}

export const { TextEncoder, TextDecoder } =
    globalThis as unknown as GlobalExtension;

const SharedEncoder = /* #__PURE__ */ new TextEncoder();
const SharedDecoder = /* #__PURE__ */ new TextDecoder();

/* #__NO_SIDE_EFFECTS__ */
export function encodeUtf8(input: string): Uint8Array {
    return SharedEncoder.encode(input);
}

/* #__NO_SIDE_EFFECTS__ */
export function decodeUtf8(buffer: ArrayBufferView | ArrayBuffer): string {
    // `TextDecoder` has internal states in stream mode,
    // but this method is not for stream mode, so the instance can be reused
    return SharedDecoder.decode(buffer);
}
