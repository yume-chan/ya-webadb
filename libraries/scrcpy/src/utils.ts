export function delay(time: number): Promise<void> {
    return new Promise(resolve => {
        (globalThis as any).setTimeout(resolve, time);
    });
}

const Utf8Encoder = new TextEncoder();
const Utf8Decoder = new TextDecoder();

export function encodeUtf8(input: string): ArrayBuffer {
    return Utf8Encoder.encode(input).buffer;
}

export function decodeUtf8(buffer: ArrayBuffer): string {
    return Utf8Decoder.decode(buffer);
}
