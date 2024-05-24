import Struct from "@yume-chan/struct";

import { encodeUtf8 } from "../../utils/index.js";

import { adbSyncEncodeId } from "./response.js";

export namespace AdbSyncRequestId {
    export const List = adbSyncEncodeId("LIST");
    export const ListV2 = adbSyncEncodeId("LIS2");
    export const Send = adbSyncEncodeId("SEND");
    export const SendV2 = adbSyncEncodeId("SND2");
    export const Lstat = adbSyncEncodeId("STAT");
    export const Stat = adbSyncEncodeId("STA2");
    export const LstatV2 = adbSyncEncodeId("LST2");
    export const Data = adbSyncEncodeId("DATA");
    export const Done = adbSyncEncodeId("DONE");
    export const Receive = adbSyncEncodeId("RECV");
}

export const AdbSyncNumberRequest = new Struct({ littleEndian: true })
    .uint32("id")
    .uint32("arg");

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
        AdbSyncNumberRequest.serialize({ id, arg: value.byteLength }),
    );
    await writable.write(value);
}
