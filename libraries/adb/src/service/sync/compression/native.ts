import {
    CompressionStream,
    DecompressionStream,
    TransformStream,
} from "@yume-chan/stream-extra";

import { NOOP } from "../../../utils/no-op.js";

import { Format } from "./format.js";
import { Mode } from "./mode.js";

export const FormatMap: Record<Format, string> = {
    [Format.None]: "",
    // https://github.com/whatwg/compression/issues/54
    [Format.Zstd]: "zstd",
    // placeholder
    [Format.Lz4]: "lz4",
    // https://github.com/whatwg/compression/pull/80
    [Format.Brotli]: "brotli",
};

const CompressionFormatCache = new Map<Format, boolean>();
const DecompressionFormatCache = new Map<Format, boolean>();

export function hasNativeSupport(format: Format, mode: Mode) {
    if (format === Format.None) {
        return true;
    }

    const Cache =
        mode === Mode.Compress
            ? CompressionFormatCache
            : DecompressionFormatCache;
    if (Cache.has(format)) {
        return Cache.get(format)!;
    }

    const Stream =
        mode === Mode.Compress ? CompressionStream : DecompressionStream;
    if (!Stream) {
        return false;
    }

    try {
        const stream = new Stream(FormatMap[format]);
        void stream.writable.abort().catch(NOOP);
        Cache.set(format, true);
        return true;
    } catch {
        Cache.set(format, false);
        return false;
    }
}

export function createNativeCompressionStream(
    format: Format,
): CompressionStream {
    if (format === Format.None) {
        return new TransformStream();
    }

    return new CompressionStream(FormatMap[format]);
}

export function createNativeDecompressionStream(
    format: Format,
): DecompressionStream {
    if (format === Format.None) {
        return new TransformStream();
    }

    return new DecompressionStream(FormatMap[format]);
}
