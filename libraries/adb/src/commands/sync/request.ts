import Struct from "@yume-chan/struct";

import { encodeUtf8 } from "../../utils/index.js";

export enum AdbSyncRequestId {
    List = "LIST",
    ListV2 = "LIS2",
    Send = "SEND",
    SendV2 = "SND2",
    Lstat = "STAT",
    Stat = "STA2",
    LstatV2 = "LST2",
    Data = "DATA",
    Done = "DONE",
    Receive = "RECV",
}

export const AdbSyncNumberRequest = new Struct({ littleEndian: true })
    .string("id", { length: 4 })
    .uint32("arg");

export interface AdbSyncWritable {
    write(buffer: Uint8Array): Promise<void>;
}

export async function adbSyncWriteRequest(
    writable: AdbSyncWritable,
    id: AdbSyncRequestId | string,
    value: number | string | Uint8Array,
): Promise<void> {
    if (typeof value === "number") {
        await writable.write(
            AdbSyncNumberRequest.serialize({ id, arg: value }),
        );
        return;
    }

    if (typeof value === "string") {
        value = encodeUtf8(value);
    }

    // `writable` will copy inputs to an internal buffer,
    // so we write header and `buffer` separately,
    // to avoid an extra copy.
    await writable.write(
        AdbSyncNumberRequest.serialize({ id, arg: value.byteLength }),
    );
    await writable.write(value);
}
