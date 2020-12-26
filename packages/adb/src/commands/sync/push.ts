import { Struct } from '@yume-chan/struct';
import { AdbBufferedStream } from '../../stream';
import { chunkArrayLike, chunkAsyncIterable } from '../../utils';
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

export async function adbSyncPush(
    stream: AdbBufferedStream,
    filename: string,
    content: ArrayLike<number> | ArrayBufferLike | AsyncIterable<ArrayBuffer>,
    mode: number = (LinuxFileType.File << 12) | 0o666,
    mtime: number = (Date.now() / 1000) | 0,
    packetSize: number = AdbSyncMaxPacketSize,
    onProgress?: (uploaded: number) => void,
): Promise<void> {
    const pathAndMode = `${filename},${mode.toString()}`;
    await adbSyncWriteRequest(stream, AdbSyncRequestId.Send, pathAndMode);

    let chunkReader: Iterable<ArrayBuffer> | AsyncIterable<ArrayBuffer>;
    if ('length' in content || 'byteLength' in content) {
        chunkReader = chunkArrayLike(content, packetSize);
    } else {
        chunkReader = chunkAsyncIterable(content, packetSize);
    }

    let uploaded = 0;
    for await (const buffer of chunkReader) {
        await adbSyncWriteRequest(stream, AdbSyncRequestId.Data, buffer);
        uploaded += buffer.byteLength;
        onProgress?.(uploaded);
    }

    await adbSyncWriteRequest(stream, AdbSyncRequestId.Done, mtime);
    await adbSyncReadResponse(stream, ResponseTypes);
}
