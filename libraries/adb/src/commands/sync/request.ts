import Struct from '@yume-chan/struct';
import type { WritableStreamDefaultWriter } from "../../stream/index.js";
import { encodeUtf8 } from "../../utils/index.js";

export enum AdbSyncRequestId {
    List = 'LIST',
    List2 = 'LIS2',
    Send = 'SEND',
    Lstat = 'STAT',
    Stat = 'STA2',
    Lstat2 = 'LST2',
    Data = 'DATA',
    Done = 'DONE',
    Receive = 'RECV',
}

export const AdbSyncNumberRequest =
    new Struct({ littleEndian: true })
        .string('id', { length: 4 })
        .uint32('arg');

export const AdbSyncDataRequest =
    new Struct({ littleEndian: true })
        .fields(AdbSyncNumberRequest)
        .uint8Array('data', { lengthField: 'arg' });

export async function adbSyncWriteRequest(
    writer: WritableStreamDefaultWriter<Uint8Array>,
    id: AdbSyncRequestId | string,
    value: number | string | Uint8Array
): Promise<void> {
    let buffer: Uint8Array;
    if (typeof value === 'number') {
        buffer = AdbSyncNumberRequest.serialize({
            id,
            arg: value,
        });
    } else if (typeof value === 'string') {
        buffer = AdbSyncDataRequest.serialize({
            id,
            data: encodeUtf8(value),
        });
    } else {
        buffer = AdbSyncDataRequest.serialize({
            id,
            data: value,
        });
    }
    await writer.write(buffer);
}
