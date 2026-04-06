import {
    CompressionStream,
    DecompressionStream,
} from "@yume-chan/stream-extra";

import type { Adb } from "../../../adb.js";
import { AdbFeature } from "../../../features.js";
import { NOOP } from "../../../utils/no-op.js";

export const Type = {
    None: 0,
    Brotli: 2,
    Lz4: 3,
    Zstd: 4,
} as const;

export type Type = (typeof Type)[keyof typeof Type];

export const Mode = {
    Compress: 0,
    Decompress: 1,
} as const;

export type Mode = (typeof Mode)[keyof typeof Mode];

const CompressionFormatCache = new Map<string, boolean>();
const DecompressionFormatCache = new Map<string, boolean>();

export function hasRuntimeSupport(format: string, mode: Mode) {
    const Stream =
        mode === Mode.Compress ? CompressionStream : DecompressionStream;
    if (!Stream) {
        return false;
    }

    const Cache =
        mode === Mode.Compress
            ? CompressionFormatCache
            : DecompressionFormatCache;
    if (Cache.has(format)) {
        return Cache.get(format)!;
    }

    try {
        const stream = new Stream(format as never);
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
        // https://github.com/whatwg/compression/pull/80
        hasRuntimeSupport("brotli", mode)
    );
}

export function canUseLz4(adb: Adb, mode: Mode) {
    return (
        adb.canUseFeature(AdbFeature.SendReceive2Lz4) &&
        // placeholder
        hasRuntimeSupport("lz4", mode)
    );
}

export function canUseZstd(adb: Adb, mode: Mode) {
    return (
        adb.canUseFeature(AdbFeature.SendReceive2Zstd) &&
        // https://github.com/whatwg/compression/issues/54
        hasRuntimeSupport("zstd", mode)
    );
}

export function canUseFormat(adb: Adb, format: Type, mode: Mode) {
    switch (format) {
        case Type.None:
            return true;
        case Type.Brotli:
            return canUseBrotli(adb, mode);
        case Type.Lz4:
            return canUseLz4(adb, mode);
        case Type.Zstd:
            return canUseZstd(adb, mode);
        default:
            return false;
    }
}

export function chooseFormat(adb: Adb, mode: Mode) {
    // The order follows
    // https://android.googlesource.com/platform/packages/modules/adb/+/3da39565cad412a743a58b94b875a43ed3c640d3/client/file_sync_client.cpp#277

    if (canUseZstd(adb, mode)) {
        return Type.Zstd;
    }

    if (canUseLz4(adb, mode)) {
        return Type.Lz4;
    }

    if (canUseBrotli(adb, mode)) {
        return Type.Brotli;
    }

    return Type.None;
}
