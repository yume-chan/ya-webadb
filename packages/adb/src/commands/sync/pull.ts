import { Struct } from '@yume-chan/struct';
import { AdbBufferedStream } from '../../stream';
import { AdbSyncRequestId, adbSyncWriteRequest } from './request';
import { AdbSyncDoneResponse, adbSyncReadResponse, AdbSyncResponseId } from './response';

export const AdbSyncDataResponse =
    new Struct({ littleEndian: true })
        .uint32('dataLength')
        .arrayBuffer('data', { lengthField: 'dataLength' })
        .extra({ id: AdbSyncResponseId.Data as const });

const ResponseTypes = {
    [AdbSyncResponseId.Data]: AdbSyncDataResponse,
    [AdbSyncResponseId.Done]: new AdbSyncDoneResponse(AdbSyncDataResponse.size),
};

export async function* adbSyncPull(
    stream: AdbBufferedStream,
    path: string,
): AsyncGenerator<ArrayBuffer, void, void> {
    await adbSyncWriteRequest(stream, AdbSyncRequestId.Receive, path);
    while (true) {
        const response = await adbSyncReadResponse(stream, ResponseTypes);
        switch (response.id) {
            case AdbSyncResponseId.Data:
                yield response.data!;
                break;
            case AdbSyncResponseId.Done:
                return;
            default:
                throw new Error('Unexpected response id');
        }
    }
}
