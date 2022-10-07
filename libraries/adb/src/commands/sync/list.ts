import type { BufferedReadableStream, WritableStreamDefaultWriter } from '@yume-chan/stream-extra';
import Struct from '@yume-chan/struct';

import { AdbSyncRequestId, adbSyncWriteRequest } from './request.js';
import { adbSyncReadResponses, AdbSyncResponseId } from './response.js';
import { AdbSyncLstatResponse, AdbSyncStatResponse, type AdbSyncStat } from './stat.js';

export interface AdbSyncEntry extends AdbSyncStat {
    name: string;
}

export const AdbSyncEntryResponse =
    new Struct({ littleEndian: true })
        .fields(AdbSyncLstatResponse)
        .uint32('nameLength')
        .string('name', { lengthField: 'nameLength' })
        .extra({ id: AdbSyncResponseId.Entry as const });

export type AdbSyncEntryResponse = typeof AdbSyncEntryResponse['TDeserializeResult'];

export const AdbSyncEntry2Response =
    new Struct({ littleEndian: true })
        .fields(AdbSyncStatResponse)
        .uint32('nameLength')
        .string('name', { lengthField: 'nameLength' })
        .extra({ id: AdbSyncResponseId.Entry2 as const });

export type AdbSyncEntry2Response = typeof AdbSyncEntry2Response['TDeserializeResult'];

export async function* adbSyncOpenDir(
    stream: BufferedReadableStream,
    writer: WritableStreamDefaultWriter<Uint8Array>,
    path: string,
    v2: boolean,
): AsyncGenerator<AdbSyncEntry, void, void> {
    if (v2) {
        await adbSyncWriteRequest(writer, AdbSyncRequestId.List2, path);
        yield* adbSyncReadResponses(stream, AdbSyncResponseId.Entry2, AdbSyncEntry2Response);
    } else {
        await adbSyncWriteRequest(writer, AdbSyncRequestId.List, path);
        for await (const item of adbSyncReadResponses(stream, AdbSyncResponseId.Entry, AdbSyncEntryResponse)) {
            // Convert to same format as `AdbSyncEntry2Response` for easier consumption.
            // However it will add some overhead.
            yield {
                mode: item.mode,
                size: BigInt(item.size),
                mtime: BigInt(item.mtime),
                get type() { return item.type; },
                get permission() { return item.permission; },
                name: item.name,
            };
        }
    }
}
