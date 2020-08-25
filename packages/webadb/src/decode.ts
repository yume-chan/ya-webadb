const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// Polyfill for Chrome < 74
if (!TextEncoder.prototype.encodeInto) {
    TextEncoder.prototype.encodeInto = function (source: string, destination: Uint8Array) {
        const array = this.encode(source);
        destination.set(array);
        return { read: source.length, written: array.length };
    }
}

export function decode(buffer: ArrayBuffer): string {
    return textDecoder.decode(buffer);
}

export function encode(string: string): ArrayBuffer {
    return textEncoder.encode(string);
}

export function encodeInto(string: string, buffer: Uint8Array): void {
    textEncoder.encodeInto(string, buffer);
}

export function stringToArrayBuffer(input: string): ArrayBuffer {
    return new Uint8Array(Array.from(input, c => c.charCodeAt(0))).buffer;
}
