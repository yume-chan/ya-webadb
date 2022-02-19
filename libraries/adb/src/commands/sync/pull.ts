import Struct from '@yume-chan/struct';
import { AdbBufferedStream, ReadableStream, WritableStreamDefaultWriter } from '../../stream';
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

export function adbSyncPull(
    stream: AdbBufferedStream,
    writer: WritableStreamDefaultWriter<ArrayBuffer>,
    path: string,
): ReadableStream<ArrayBuffer> {
    return new ReadableStream({
        async start() {
            await adbSyncWriteRequest(writer, AdbSyncRequestId.Receive, path);
        },
        async pull(controller) {
            const response = await adbSyncReadResponse(stream, ResponseTypes);
            switch (response.id) {
                case AdbSyncResponseId.Data:
                    controller.enqueue(response.data!);
                    break;
                case AdbSyncResponseId.Done:
                    controller.close();
                    break;
                default:
                    throw new Error('Unexpected response id');
            }
        }
    }, {
        highWaterMark: 16 * 1024,
        size(chunk) { return chunk.byteLength; }
    });
}
