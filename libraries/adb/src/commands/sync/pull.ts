import Struct from '@yume-chan/struct';
import { AdbBufferedStream } from '../../stream';
import { ReadableStream, WritableStreamDefaultWriter } from "../../utils";
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
    bufferSize: number = 16 * 1024,
): ReadableStream<ArrayBuffer> {
    return new ReadableStream({
        async start(controller) {
            try {
                await adbSyncWriteRequest(writer, AdbSyncRequestId.Receive, path);
            } catch (e) {
                controller.error(e);
            }
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
                    controller.error(new Error('Unexpected response id'));
                    break;
            }
        }
    }, {
        highWaterMark: bufferSize,
        size(chunk) { return chunk.byteLength; }
    });
}
