import Struct, { type StructAsyncDeserializeStream, type StructLike, type StructValueType } from '@yume-chan/struct';
import type { AdbBufferedStream } from '../../stream/index.js';
import { decodeUtf8 } from "../../utils/index.js";

export enum AdbSyncResponseId {
    Entry = 'DENT',
    Entry2 = 'DNT2',
    Lstat = 'STAT',
    Stat = 'STA2',
    Lstat2 = 'LST2',
    Done = 'DONE',
    Data = 'DATA',
    Ok = 'OKAY',
    Fail = 'FAIL',
}

// DONE responses' size are always same as the request's normal response.
// For example DONE responses for LIST requests are 16 bytes (same as DENT responses),
// but DONE responses for STAT requests are 12 bytes (same as STAT responses)
// So we need to know responses' size in advance.
export class AdbSyncDoneResponse implements StructLike<AdbSyncDoneResponse> {
    private length: number;

    public readonly id = AdbSyncResponseId.Done;

    public constructor(length: number) {
        this.length = length;
    }

    public async deserialize(stream: StructAsyncDeserializeStream): Promise<this> {
        await stream.read(this.length);
        return this;
    }
}

export const AdbSyncFailResponse =
    new Struct({ littleEndian: true })
        .uint32('messageLength')
        .string('message', { lengthField: 'messageLength' })
        .postDeserialize(object => {
            throw new Error(object.message);
        });

export async function adbSyncReadResponse<T extends Record<string, StructLike<any>>>(
    stream: AdbBufferedStream,
    types: T,
    // When `T` is a union type, `T[keyof T]` only includes their common keys.
    // For example, let `type T = { a: string, b: string } | { a: string, c: string}`,
    // `keyof T` is `'a'`, not `'a' | 'b' | 'c'`.
    // However, `T extends unknown ? keyof T : never` will distribute `T`,
    // so returns all keys.
): Promise<StructValueType<T extends unknown ? T[keyof T] : never>> {
    const id = decodeUtf8(await stream.read(4));

    if (id === AdbSyncResponseId.Fail) {
        await AdbSyncFailResponse.deserialize(stream);
    }

    if (types[id]) {
        return types[id]!.deserialize(stream);
    }

    throw new Error(`Expected '${Object.keys(types).join(', ')}', but got '${id}'`);
}
