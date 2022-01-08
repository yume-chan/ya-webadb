import Struct from '@yume-chan/struct';
import type { AdbBufferedStream } from '../../stream';
import { encodeUtf8 } from "../../utils";

export enum AdbSyncRequestId {
    List = 'LIST',
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
        .arrayBuffer('data', { lengthField: 'arg' });

export async function adbSyncWriteRequest(
    stream: AdbBufferedStream,
    id: AdbSyncRequestId | string,
    value: number | string | ArrayBuffer
): Promise<void> {
    let buffer: ArrayBuffer;
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
    await stream.write(buffer);
}
