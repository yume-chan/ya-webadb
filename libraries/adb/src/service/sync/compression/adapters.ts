import type { TransformStream } from "@yume-chan/stream-extra";

import type { Adb } from "../../../adb.js";
import { AdbFeature } from "../../../features.js";

import { Format, FormatNameMap } from "./format.js";
import { Mode } from "./mode.js";
import {
    createNativeCompressionStream,
    createNativeDecompressionStream,
    hasNativeSupport,
} from "./native.js";

export { Format, FormatNameMap, Mode };

export type Adapter = () => TransformStream<Uint8Array, Uint8Array>;

const CompressionRegistry: Partial<
    Record<Exclude<Format, typeof Format.None>, Adapter>
> = {};

const DecompressionRegistry: Partial<
    Record<Exclude<Format, typeof Format.None>, Adapter>
> = {};

export function registerCompressionAdapter(
    format: Exclude<Format, typeof Format.None>,
    adapter: Adapter,
) {
    CompressionRegistry[format] = adapter;
}

export function registerDecompressionAdapter(
    format: Exclude<Format, typeof Format.None>,
    adapter: Adapter,
) {
    DecompressionRegistry[format] = adapter;
}

function hasAdapterOrNativeSupport(format: Format, mode: Mode) {
    if (format === Format.None) {
        return true;
    }

    const Registry =
        mode === Mode.Compress ? CompressionRegistry : DecompressionRegistry;
    if (Registry[format]) {
        return true;
    }

    return hasNativeSupport(format, mode);
}

export function canUseBrotli(adb: Adb, mode: Mode) {
    return (
        adb.canUseFeature(AdbFeature.SendReceive2Brotli) &&
        hasAdapterOrNativeSupport(Format.Brotli, mode)
    );
}

export function canUseLz4(adb: Adb, mode: Mode) {
    return (
        adb.canUseFeature(AdbFeature.SendReceive2Lz4) &&
        hasAdapterOrNativeSupport(Format.Lz4, mode)
    );
}

export function canUseZstd(adb: Adb, mode: Mode) {
    return (
        adb.canUseFeature(AdbFeature.SendReceive2Zstd) &&
        hasAdapterOrNativeSupport(Format.Zstd, mode)
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

export function createCompressionStream(
    format: Exclude<Format, typeof Format.None>,
): TransformStream<Uint8Array, Uint8Array> {
    const adapter = CompressionRegistry[format];
    if (adapter) {
        return adapter();
    }
    if (hasNativeSupport(format, Mode.Compress)) {
        return createNativeCompressionStream(format);
    }
    throw new Error(
        `No adapter registered for format ${FormatNameMap[format]}`,
    );
}

export function createDecompressionStream(
    format: Exclude<Format, typeof Format.None>,
): TransformStream<Uint8Array, Uint8Array> {
    const adapter = DecompressionRegistry[format];
    if (adapter) {
        return adapter();
    }
    if (hasNativeSupport(format, Mode.Decompress)) {
        return createNativeDecompressionStream(format);
    }
    throw new Error(
        `No adapter registered for format ${FormatNameMap[format]}`,
    );
}
