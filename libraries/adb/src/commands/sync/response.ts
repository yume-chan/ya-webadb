import { getUint32LittleEndian } from "@yume-chan/no-data-view";
import type { AsyncExactReadable, StructDeserializer } from "@yume-chan/struct";
import { decodeUtf8, string, struct, u32 } from "@yume-chan/struct";

import { unreachable } from "../../utils/no-op.js";

function encodeAsciiUnchecked(value: string): Uint8Array<ArrayBuffer> {
    const result = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i += 1) {
        result[i] = value.charCodeAt(i);
    }
    return result;
}

/**
 * Encode ID to numbers for faster comparison
 * @param value A 4-character string
 * @returns A 32-bit integer by encoding the string as little-endian
 *
 * #__NO_SIDE_EFFECTS__
 */
export function adbSyncEncodeId(value: string): number {
    const buffer = encodeAsciiUnchecked(value);
    return getUint32LittleEndian(buffer, 0);
}

export const AdbSyncResponseId = {
    Entry: adbSyncEncodeId("DENT"),
    Entry2: adbSyncEncodeId("DNT2"),
    Lstat: adbSyncEncodeId("STAT"),
    Stat: adbSyncEncodeId("STA2"),
    Lstat2: adbSyncEncodeId("LST2"),
    Done: adbSyncEncodeId("DONE"),
    Data: adbSyncEncodeId("DATA"),
    Ok: adbSyncEncodeId("OKAY"),
    Fail: adbSyncEncodeId("FAIL"),
};

export class AdbSyncError extends Error {}

export const AdbSyncFailResponse = struct(
    { message: string(u32) },
    {
        littleEndian: true,
        postDeserialize(value) {
            throw new AdbSyncError(value.message);
        },
    },
);

export async function adbSyncReadResponse<T>(
    stream: AsyncExactReadable,
    id: number | string,
    type: StructDeserializer<T>,
): Promise<T> {
    if (typeof id === "string") {
        id = adbSyncEncodeId(id);
    }

    const buffer = await stream.readExactly(4);
    switch (getUint32LittleEndian(buffer, 0)) {
        case AdbSyncResponseId.Fail:
            await AdbSyncFailResponse.deserialize(stream);
            throw new Error("Unreachable");
        case id:
            return await type.deserialize(stream);
        default:
            throw new Error(
                `Expected '${id}', but got '${decodeUtf8(buffer)}'`,
            );
    }
}

export async function* adbSyncReadResponses<T>(
    stream: AsyncExactReadable,
    id: number | string,
    type: StructDeserializer<T>,
): AsyncGenerator<T, void, void> {
    if (typeof id === "string") {
        id = adbSyncEncodeId(id);
    }

    while (true) {
        const buffer = await stream.readExactly(4);
        switch (getUint32LittleEndian(buffer, 0)) {
            case AdbSyncResponseId.Fail:
                await AdbSyncFailResponse.deserialize(stream);
                unreachable();
            case AdbSyncResponseId.Done:
                // `DONE` responses' size are always same as the request's normal response.
                //
                // For example, `DONE` responses for `LIST` requests are 16 bytes (same as `DENT` responses),
                // but `DONE` responses for `STAT` requests are 12 bytes (same as `STAT` responses).
                await stream.readExactly(type.size);
                return;
            case id:
                yield await type.deserialize(stream);
                break;
            default:
                throw new Error(
                    `Expected '${id}' or '${AdbSyncResponseId.Done}', but got '${decodeUtf8(buffer)}'`,
                );
        }
    }
}
