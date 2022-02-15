import Struct from '@yume-chan/struct';
import { AdbBufferedStream } from '../../stream';
import { chunkArrayLike, WritableStream, WritableStreamDefaultWriter } from '../../utils';
import { AdbSyncRequestId, adbSyncWriteRequest } from './request';
import { adbSyncReadResponse, AdbSyncResponseId } from './response';
import { LinuxFileType } from './stat';

export const AdbSyncOkResponse =
    new Struct({ littleEndian: true })
        .uint32('unused');

const ResponseTypes = {
    [AdbSyncResponseId.Ok]: AdbSyncOkResponse,
};

export const AdbSyncMaxPacketSize = 64 * 1024;

export function adbSyncPush(
    stream: AdbBufferedStream,
    writer: WritableStreamDefaultWriter<ArrayBuffer>,
    filename: string,
    mode: number = (LinuxFileType.File << 12) | 0o666,
    mtime: number = (Date.now() / 1000) | 0,
    packetSize: number = AdbSyncMaxPacketSize,
): WritableStream<ArrayBuffer> {
    return new WritableStream({
        async start() {
            const pathAndMode = `${filename},${mode.toString()}`;
            await adbSyncWriteRequest(writer, AdbSyncRequestId.Send, pathAndMode);
        },
        async write(chunk) {
            for (const buffer of chunkArrayLike(chunk, packetSize)) {
                await adbSyncWriteRequest(writer, AdbSyncRequestId.Data, buffer);
            }
        },
        async close() {
            await adbSyncWriteRequest(writer, AdbSyncRequestId.Done, mtime);
            await adbSyncReadResponse(stream, ResponseTypes);
        }
    }, {
        highWaterMark: 16 * 1024,
        size(chunk) { return chunk.byteLength; }
    });
}
