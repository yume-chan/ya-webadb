import { getUint32LittleEndian } from "@yume-chan/no-data-view";
import type { AsyncExactReadable, StructDeserializer } from "@yume-chan/struct";
import { decodeUtf8, string, struct, u32 } from "@yume-chan/struct";

import { unreachable } from "../../utils/index.js";

import { AdbSyncResponseId } from "./id.js";

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
    id: number,
    type: StructDeserializer<T>,
): Promise<T> {
    const buffer = await stream.readExactly(4);
    switch (getUint32LittleEndian(buffer, 0)) {
        case AdbSyncResponseId.Fail:
            await AdbSyncFailResponse.deserialize(stream);
            unreachable();
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
    id: number,
    type: StructDeserializer<T>,
): AsyncGenerator<T, void, void> {
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
