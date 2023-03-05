import type {
    StructAsyncDeserializeStream,
    StructLike,
    StructValueType,
} from "@yume-chan/struct";
import Struct from "@yume-chan/struct";

import { decodeUtf8 } from "../../utils/index.js";

export enum AdbSyncResponseId {
    Entry = "DENT",
    Entry2 = "DNT2",
    Lstat = "STAT",
    Stat = "STA2",
    Lstat2 = "LST2",
    Done = "DONE",
    Data = "DATA",
    Ok = "OKAY",
    Fail = "FAIL",
}

export const AdbSyncFailResponse = new Struct({ littleEndian: true })
    .uint32("messageLength")
    .string("message", { lengthField: "messageLength" })
    .postDeserialize((object) => {
        throw new Error(object.message);
    });

export async function adbSyncReadResponse<T>(
    stream: StructAsyncDeserializeStream,
    id: AdbSyncResponseId,
    type: StructLike<T>
): Promise<T> {
    const actualId = decodeUtf8(await stream.read(4));
    switch (actualId) {
        case AdbSyncResponseId.Fail:
            await AdbSyncFailResponse.deserialize(stream);
            throw new Error("Unreachable");
        case id:
            return await type.deserialize(stream);
        default:
            throw new Error(`Expected '${id}', but got '${actualId}'`);
    }
}

export async function* adbSyncReadResponses<
    T extends Struct<object, PropertyKey, object, any>
>(
    stream: StructAsyncDeserializeStream,
    id: AdbSyncResponseId,
    type: T
): AsyncGenerator<StructValueType<T>, void, void> {
    while (true) {
        const actualId = decodeUtf8(await stream.read(4));
        switch (actualId) {
            case AdbSyncResponseId.Fail:
                await AdbSyncFailResponse.deserialize(stream);
                throw new Error("Unreachable");
            case AdbSyncResponseId.Done:
                // `DONE` responses' size are always same as the request's normal response.
                //
                // For example, `DONE` responses for `LIST` requests are 16 bytes (same as `DENT` responses),
                // but `DONE` responses for `STAT` requests are 12 bytes (same as `STAT` responses).
                await stream.read(type.size);
                return;
            case id:
                yield await type.deserialize(stream);
                break;
            default:
                throw new Error(
                    `Expected '${id}' or '${AdbSyncResponseId.Done}', but got '${actualId}'`
                );
        }
    }
}
