import Struct from '@yume-chan/struct';
import { AdbBufferedStream, ReadableStream, WritableStreamDefaultWriter } from '../../stream/index.js';
import { AdbSyncRequestId, adbSyncWriteRequest } from './request.js';
import { AdbSyncDoneResponse, adbSyncReadResponse, AdbSyncResponseId } from './response.js';

export const AdbSyncDataResponse =
    new Struct({ littleEndian: true })
        .uint32('dataLength')
        .uint8Array('data', { lengthField: 'dataLength' })
        .extra({ id: AdbSyncResponseId.Data as const });

const ResponseTypes = {
    [AdbSyncResponseId.Data]: AdbSyncDataResponse,
    [AdbSyncResponseId.Done]: new AdbSyncDoneResponse(AdbSyncDataResponse.size),
};

export function adbSyncPull(
    stream: AdbBufferedStream,
    writer: WritableStreamDefaultWriter<Uint8Array>,
    path: string,
): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
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
