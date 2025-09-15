import { getUint32LittleEndian } from "@yume-chan/no-data-view";

function encodeAsciiUnchecked(value: string): Uint8Array<ArrayBuffer> {
    const result = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i += 1) {
        result[i] = value.charCodeAt(i);
    }
    return result;
}

/**
 * Encode ID to numbers for faster comparison.
 *
 * This function skips all checks. The caller must ensure the input is valid.
 *
 * @param value A 4 ASCII character string.
 * @returns A 32-bit integer by encoding the string as little-endian
 *
 * #__NO_SIDE_EFFECTS__
 */
export function adbSyncEncodeId(value: string): number {
    const buffer = encodeAsciiUnchecked(value);
    return getUint32LittleEndian(buffer, 0);
}

// https://cs.android.com/android/platform/superproject/main/+/main:packages/modules/adb/file_sync_protocol.h;l=23;drc=888a54dcbf954fdffacc8283a793290abcc589cd

export const Lstat = adbSyncEncodeId("STAT");
export const Stat = adbSyncEncodeId("STA2");
export const LstatV2 = adbSyncEncodeId("LST2");

export const Done = adbSyncEncodeId("DONE");
export const Data = adbSyncEncodeId("DATA");
