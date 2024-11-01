import { encodeUtf8, struct, u32 } from "@yume-chan/struct";

import { adbSyncEncodeId } from "./response.js";

export const AdbSyncRequestId = {
    List: adbSyncEncodeId("LIST"),
    ListV2: adbSyncEncodeId("LIS2"),
    Send: adbSyncEncodeId("SEND"),
    SendV2: adbSyncEncodeId("SND2"),
    Lstat: adbSyncEncodeId("STAT"),
    Stat: adbSyncEncodeId("STA2"),
    LstatV2: adbSyncEncodeId("LST2"),
    Data: adbSyncEncodeId("DATA"),
    Done: adbSyncEncodeId("DONE"),
    Receive: adbSyncEncodeId("RECV"),
} as const;

export const AdbSyncNumberRequest = struct(
    { id: u32, arg: u32 },
    { littleEndian: true },
);

export interface AdbSyncWritable {
    write(buffer: Uint8Array): Promise<void>;
}

export async function adbSyncWriteRequest(
    writable: AdbSyncWritable,
    id: number | string,
    value: number | string | Uint8Array,
): Promise<void> {
    if (typeof id === "string") {
        id = adbSyncEncodeId(id);
    }

    if (typeof value === "number") {
        await writable.write(
            AdbSyncNumberRequest.serialize({ id, arg: value }),
        );
        return;
    }

    if (typeof value === "string") {
        value = encodeUtf8(value);
    }

    // `writable` is buffered, it copies inputs to an internal buffer,
    // so don't concatenate headers and data here, that will be an unnecessary copy.
    await writable.write(
        AdbSyncNumberRequest.serialize({ id, arg: value.length }),
    );
    await writable.write(value);
}
