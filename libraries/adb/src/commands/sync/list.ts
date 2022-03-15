import Struct from '@yume-chan/struct';
import type { AdbBufferedStream, WritableStreamDefaultWriter } from '../../stream';
import { AdbSyncRequestId, adbSyncWriteRequest } from './request';
import { AdbSyncDoneResponse, adbSyncReadResponse, AdbSyncResponseId } from './response';
import { AdbSyncLstatResponse } from './stat';

export const AdbSyncEntryResponse =
    new Struct({ littleEndian: true })
        .fields(AdbSyncLstatResponse)
        .uint32('nameLength')
        .string('name', { lengthField: 'nameLength' })
        .extra({ id: AdbSyncResponseId.Entry as const });

export type AdbSyncEntryResponse = typeof AdbSyncEntryResponse['TDeserializeResult'];

const ResponseTypes = {
    [AdbSyncResponseId.Entry]: AdbSyncEntryResponse,
    [AdbSyncResponseId.Done]: new AdbSyncDoneResponse(AdbSyncEntryResponse.size),
};

export async function* adbSyncOpenDir(
    stream: AdbBufferedStream,
    writer: WritableStreamDefaultWriter<Uint8Array>,
    path: string,
): AsyncGenerator<AdbSyncEntryResponse, void, void> {
    await adbSyncWriteRequest(writer, AdbSyncRequestId.List, path);

    while (true) {
        const response = await adbSyncReadResponse(stream, ResponseTypes);
        switch (response.id) {
            case AdbSyncResponseId.Entry:
                yield response;
                break;
            case AdbSyncResponseId.Done:
                return;
            default:
                throw new Error('Unexpected response id');
        }
    }
}
