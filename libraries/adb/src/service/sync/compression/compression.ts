import {
    CompressionStream,
    DecompressionStream,
    TransformStream,
} from "@yume-chan/stream-extra";

import type { Adb } from "../../../adb.js";
import { AdbFeature } from "../../../features.js";
import { NOOP } from "../../../utils/no-op.js";

export const Format = {
    None: 0,
    Brotli: 2,
    Lz4: 3,
    Zstd: 4,
} as const;

export type Format = (typeof Format)[keyof typeof Format];

export const Mode = {
    Compress: 0,
    Decompress: 1,
} as const;

export type Mode = (typeof Mode)[keyof typeof Mode];

const FormatMap: Record<Format, string> = {
    [Format.None]: "",
    // https://github.com/whatwg/compression/pull/80
    [Format.Zstd]: "zstd",
    // placeholder
    [Format.Lz4]: "lz4",
    // https://github.com/whatwg/compression/pull/80
    [Format.Brotli]: "brotli",
};

const CompressionFormatCache = new Map<Format, boolean>();
const DecompressionFormatCache = new Map<Format, boolean>();

export function hasRuntimeSupport(format: Format, mode: Mode) {
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

export function canUseBrotli(adb: Adb, mode: Mode) {
    return (
        adb.canUseFeature(AdbFeature.SendReceive2Brotli) &&
        hasRuntimeSupport(Format.Brotli, mode)
    );
}

export function canUseLz4(adb: Adb, mode: Mode) {
    return (
        adb.canUseFeature(AdbFeature.SendReceive2Lz4) &&
        hasRuntimeSupport(Format.Lz4, mode)
    );
}

export function canUseZstd(adb: Adb, mode: Mode) {
    return (
        adb.canUseFeature(AdbFeature.SendReceive2Zstd) &&
        hasRuntimeSupport(Format.Zstd, mode)
    );
}

export function canUseFormat(adb: Adb, format: Format, mode: Mode) {
    switch (format) {
        case Format.None:
            return true;
        case Format.Brotli:
            return canUseBrotli(adb, mode);
        case Format.Lz4:
            return canUseLz4(adb, mode);
        case Format.Zstd:
            return canUseZstd(adb, mode);
        default:
            return false;
    }
}

export function chooseFormat(adb: Adb, mode: Mode) {
    // The order follows
    // https://android.googlesource.com/platform/packages/modules/adb/+/3da39565cad412a743a58b94b875a43ed3c640d3/client/file_sync_client.cpp#277

    if (canUseZstd(adb, mode)) {
        return Format.Zstd;
    }

    if (canUseLz4(adb, mode)) {
        return Format.Lz4;
    }

    if (canUseBrotli(adb, mode)) {
        return Format.Brotli;
    }

    return Format.None;
}

export function createCompressionStream(format: Format): CompressionStream {
    if (format === Format.None) {
        return new TransformStream();
    }

    return new CompressionStream(FormatMap[format]);
}
