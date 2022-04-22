import Struct from '@yume-chan/struct';
import type { AdbBufferedStream, WritableStreamDefaultWriter } from '../../stream/index.js';
import { AdbSyncRequestId, adbSyncWriteRequest } from './request.js';
import { AdbSyncDoneResponse, adbSyncReadResponse, AdbSyncResponseId } from './response.js';
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

const LIST_V1_RESPONSE_TYPES = {
    [AdbSyncResponseId.Entry]: AdbSyncEntryResponse,
    [AdbSyncResponseId.Done]: new AdbSyncDoneResponse(AdbSyncEntryResponse.size),
};

const LIST_V2_RESPONSE_TYPES = {
    [AdbSyncResponseId.Entry2]: AdbSyncEntry2Response,
    [AdbSyncResponseId.Done]: new AdbSyncDoneResponse(AdbSyncEntry2Response.size),
};

export async function* adbSyncOpenDir(
    stream: AdbBufferedStream,
    writer: WritableStreamDefaultWriter<Uint8Array>,
    path: string,
    v2: boolean,
): AsyncGenerator<AdbSyncEntry, void, void> {
    let requestId: AdbSyncRequestId.List | AdbSyncRequestId.List2;
    let responseType: typeof LIST_V1_RESPONSE_TYPES | typeof LIST_V2_RESPONSE_TYPES;

    if (v2) {
        requestId = AdbSyncRequestId.List2;
        responseType = LIST_V2_RESPONSE_TYPES;
    } else {
        requestId = AdbSyncRequestId.List;
        responseType = LIST_V1_RESPONSE_TYPES;
    }

    await adbSyncWriteRequest(writer, requestId, path);

    while (true) {
        const response = await adbSyncReadResponse(stream, responseType);
        switch (response.id) {
            case AdbSyncResponseId.Entry:
                yield {
                    mode: response.mode,
                    size: BigInt(response.size),
                    mtime: BigInt(response.mtime),
                    get type() { return response.type; },
                    get permission() { return response.permission; },
                    name: response.name,
                };
                break;
            case AdbSyncResponseId.Entry2:
                // `LST2` can return error codes for failed `lstat` calls.
                // `LIST` just ignores them.
                // But they only contain `name` so still pretty useless.
                if (response.error !== 0) {
                    continue;
                }
                yield response;
                break;
            case AdbSyncResponseId.Done:
                return;
            default:
                throw new Error('Unexpected response id');
        }
    }
}
