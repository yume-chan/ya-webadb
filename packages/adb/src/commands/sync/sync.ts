import { AutoDisposable } from '@yume-chan/event';
import { placeholder, Struct, StructDeserializationContext, StructInitType, StructValueType } from '@yume-chan/struct';
import { Adb } from '../../adb';
import { AdbFeatures } from '../../features';
import { AdbBufferedStream, AdbStream } from '../../stream';
import { AutoResetEvent } from '../../utils';

export enum AdbSyncRequestId {
    List = 'LIST',
    Send = 'SEND',
    Lstat = 'STAT',
    Stat = 'STA2',
    Lstat2 = 'LST2',
    Data = 'DATA',
    Done = 'DONE',
    Receive = 'RECV',
}

export enum AdbSyncResponseId {
    Entry = 'DENT',
    Lstat = 'STAT',
    Stat = 'STA2',
    Lstat2 = 'LST2',
    Done = 'DONE',
    Data = 'DATA',
    Ok = 'OKAY',
    Fail = 'FAIL',
}

const AdbSyncNumberRequest =
    new Struct({ littleEndian: true })
        .string('id', { length: 4 })
        .uint32('arg');

const AdbSyncStringRequest =
    AdbSyncNumberRequest
        .string('data', { lengthField: 'arg' });

const AdbSyncBufferRequest =
    AdbSyncNumberRequest
        .arrayBuffer('data', { lengthField: 'arg' });

// https://github.com/python/cpython/blob/4e581d64b8aff3e2eda99b12f080c877bb78dfca/Lib/stat.py#L36
export enum LinuxFileType {
    Directory = 0o04,
    File = 0o10,
    Link = 0o12,
}

export const AdbSyncLstatResponse =
    new Struct({ littleEndian: true })
        .int32('mode')
        .int32('size')
        .int32('mtime')
        .extra({
            id: AdbSyncResponseId.Lstat as const,
            get type() { return this.mode >> 12 as LinuxFileType; },
            get permission() { return this.mode & 0b00001111_11111111; },
        })
        .afterParsed((object) => {
            if (object.mode === 0 &&
                object.size === 0 &&
                object.mtime === 0
            ) {
                throw new Error('lstat failed');
            }
        });

export type AdbSyncLstatResponse = StructValueType<typeof AdbSyncLstatResponse>;

export enum ErrorCode {
    EACCES = 13,
    EEXIST = 17,
    EFAULT = 14,
    EFBIG = 27,
    EINTR = 4,
    EINVAL = 22,
    EIO = 5,
    EISDIR = 21,
    ELOOP = 40,
    EMFILE = 24,
    ENAMETOOLONG = 36,
    ENFILE = 23,
    ENOENT = 2,
    ENOMEM = 12,
    ENOSPC = 28,
    ENOTDIR = 20,
    EOVERFLOW = 75,
    EPERM = 1,
    EROFS = 30,
    ETXTBSY = 26,
}

export const AdbSyncStatResponse =
    new Struct({ littleEndian: true })
        .uint32('error', undefined, placeholder<ErrorCode>())
        .uint64('dev')
        .uint64('ino')
        .uint32('mode')
        .uint32('nlink')
        .uint32('uid')
        .uint32('gid')
        .uint64('size')
        .uint64('atime')
        .uint64('mtime')
        .uint64('ctime')
        .extra({
            id: AdbSyncResponseId.Stat as const,
            get type() { return this.mode >> 12 as LinuxFileType; },
            get permission() { return this.mode & 0b00001111_11111111; },
        })
        .afterParsed((object) => {
            if (object.error) {
                throw new Error(ErrorCode[object.error]);
            }
        });

export type AdbSyncStatResponse = StructValueType<typeof AdbSyncStatResponse>;

export const AdbSyncEntryResponse =
    AdbSyncLstatResponse
        .afterParsed()
        .uint32('nameLength')
        .string('name', { lengthField: 'nameLength' })
        .extra({ id: AdbSyncResponseId.Entry as const });

export type AdbSyncEntryResponse = StructValueType<typeof AdbSyncEntryResponse>;

export const AdbSyncDataResponse =
    new Struct({ littleEndian: true })
        .uint32('dataLength')
        .arrayBuffer('data', { lengthField: 'dataLength' })
        .extra({ id: AdbSyncResponseId.Data as const });

export interface AdbSyncDoneResponseDeserializeContext extends StructDeserializationContext {
    size: number;
}

export class AdbSyncDoneResponse {
    public static readonly instance = new AdbSyncDoneResponse();

    public static async deserialize(
        context: AdbSyncDoneResponseDeserializeContext
    ): Promise<AdbSyncDoneResponse> {
        await context.read(context.size);
        return AdbSyncDoneResponse.instance;
    }

    public readonly id = AdbSyncResponseId.Done;
}

export const AdbSyncFailResponse =
    new Struct({ littleEndian: true })
        .uint32('messageLength')
        .string('message', { lengthField: 'messageLength' })
        .afterParsed(object => {
            throw new Error(object.message);
        });

const ResponseTypeMap = {
    [AdbSyncResponseId.Entry]: AdbSyncEntryResponse,
    [AdbSyncResponseId.Lstat]: AdbSyncLstatResponse,
    [AdbSyncResponseId.Stat]: AdbSyncStatResponse,
    [AdbSyncResponseId.Lstat2]: AdbSyncStatResponse,
    [AdbSyncResponseId.Data]: AdbSyncDataResponse,
    [AdbSyncResponseId.Fail]: AdbSyncFailResponse,
    [AdbSyncResponseId.Done]: AdbSyncDoneResponse,
} as const;

async function readResponse(stream: AdbBufferedStream, size: number) {
    // DONE responses' size are always same as the request's normal response.
    // For example DONE responses for LIST requests are 16 bytes (same as DENT responses),
    // but DONE responses for STAT requests are 12 bytes (same as STAT responses)
    // So we need to know responses' size in advance.
    const id = stream.backend.decodeUtf8(await stream.read(4)) as keyof typeof ResponseTypeMap;

    if (ResponseTypeMap[id]) {
        return ResponseTypeMap[id].deserialize({
            size,
            read: stream.read.bind(stream),
            decodeUtf8: stream.backend.decodeUtf8.bind(stream.backend),
            encodeUtf8: stream.backend.encodeUtf8.bind(stream.backend),
        });
    }

    await stream.read(size);
    throw new Error('Unexpected response id');
}

export function chunkArray(
    value: ArrayLike<number>,
    size: number
): Generator<ArrayBuffer, void, void> {
    return chunkArrayBuffer(new Uint8Array(value).buffer, size);
}

export function* chunkArrayBuffer(
    value: ArrayBufferLike,
    size: number
): Generator<ArrayBuffer, void, void> {
    if (value.byteLength <= size) {
        return yield value;
    }

    for (let i = 0; i < value.byteLength; i += size) {
        yield value.slice(i, i + size);
    }
}

export async function* chunkAsyncIterable(
    value: AsyncIterable<ArrayBuffer>,
    size: number
): AsyncGenerator<ArrayBuffer, void, void> {
    let result = new Uint8Array(size);
    let index = 0;
    for await (let buffer of value) {
        // `result` has some data, `result + buffer` is enough
        if (index !== 0 && index + buffer.byteLength >= size) {
            const remainder = size - index;
            result.set(new Uint8Array(buffer, 0, remainder), index);
            yield result.buffer;

            result = new Uint8Array(size);
            index = 0;

            if (buffer.byteLength > remainder) {
                // `buffer` still has some data
                buffer = buffer.slice(remainder);
            } else {
                continue;
            }
        }

        // `result` is empty, `buffer` alone is enough
        if (buffer.byteLength >= size) {
            let remainder = false;
            for (const chunk of chunkArrayBuffer(buffer, size)) {
                if (chunk.byteLength === size) {
                    yield chunk;
                }

                // `buffer` still has some data
                remainder = true;
                buffer = chunk;
            }

            if (!remainder) {
                continue;
            }
        }

        // `result` has some data but `result + buffer` is still not enough
        // or after previous steps `buffer` still has some data
        result.set(new Uint8Array(buffer), index);
        index += buffer.byteLength;
    }
}

export class AdbSync extends AutoDisposable {
    protected adb: Adb;

    protected stream: AdbBufferedStream;

    protected sendLock = this.addDisposable(new AutoResetEvent());

    public get supportStat(): boolean {
        return this.adb.features!.includes(AdbFeatures.StatV2);
    }

    public constructor(adb: Adb, stream: AdbStream) {
        super();

        this.adb = adb;
        this.stream = new AdbBufferedStream(stream);
    }

    protected send<T extends Struct<object, object, object, unknown>>(
        type: T,
        value: StructInitType<T>
    ) {
        return this.stream.write(type.serialize(value, this.stream.backend));
    }

    public async lstat(path: string): Promise<AdbSyncLstatResponse | AdbSyncStatResponse> {
        await this.sendLock.wait();

        try {
            let requestId: AdbSyncRequestId.Lstat | AdbSyncRequestId.Lstat2;
            let responseType: typeof AdbSyncLstatResponse | typeof AdbSyncStatResponse;
            let responseId: AdbSyncResponseId.Lstat | AdbSyncResponseId.Stat;

            if (this.supportStat) {
                requestId = AdbSyncRequestId.Lstat2;
                responseType = AdbSyncStatResponse;
                responseId = AdbSyncResponseId.Stat;
            } else {
                requestId = AdbSyncRequestId.Lstat;
                responseType = AdbSyncLstatResponse;
                responseId = AdbSyncResponseId.Lstat;
            }

            await this.send(AdbSyncStringRequest, { id: requestId, data: path });
            const response = await readResponse(this.stream, responseType.size);
            if (response.id !== responseId) {
                throw new Error('Unexpected response id');
            }
            return response;
        } finally {
            this.sendLock.notify();
        }
    }

    public async stat(path: string) {
        if (!this.supportStat) {
            throw new Error('Not supported');
        }

        await this.sendLock.wait();

        try {
            await this.send(AdbSyncStringRequest, { id: AdbSyncRequestId.Stat, data: path });
            const response = await readResponse(this.stream, AdbSyncStatResponse.size);
            if (response.id !== AdbSyncResponseId.Stat) {
                throw new Error('Unexpected response id');
            }
            return response;
        } finally {
            this.sendLock.notify();
        }
    }

    public async isDirectory(path: string): Promise<boolean> {
        await this.sendLock.wait();

        try {
            await this.stat(path + '/');
            return true;
        } catch (e) {
            return false;
        } finally {
            this.sendLock.notify();
        }
    }

    public async *opendir(path: string) {
        await this.sendLock.wait();

        try {
            await this.send(AdbSyncStringRequest, { id: AdbSyncRequestId.List, data: path });

            while (true) {
                const response = await readResponse(this.stream, AdbSyncEntryResponse.size);
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
        } finally {
            this.sendLock.notify();
        }
    }

    public async readdir(path: string) {
        const results: AdbSyncEntryResponse[] = [];
        for await (const entry of this.opendir(path)) {
            results.push(entry);
        }
        return results;
    }

    public async *read(path: string): AsyncGenerator<ArrayBuffer, void, void> {
        await this.sendLock.wait();

        try {
            await this.send(AdbSyncStringRequest, { id: AdbSyncRequestId.Receive, data: path });
            while (true) {
                const response = await readResponse(this.stream, AdbSyncDataResponse.size);
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
        } finally {
            this.sendLock.notify();
        }
    }

    public async write(
        path: string,
        file: AsyncIterable<ArrayBuffer>,
        mode?: number,
        mtime?: number,
    ): Promise<void>;
    public async write(
        path: string,
        file: ArrayLike<number>,
        mode?: number,
        mtime?: number,
    ): Promise<void>;
    public async write(
        path: string,
        file: AsyncIterable<ArrayBuffer> | ArrayLike<number>,
        mode = 0o777,
        mtime = Date.now(),
    ): Promise<void> {
        await this.sendLock.wait();
        const packetSize = 64 * 1024;

        try {
            const pathAndMode = `${path},${mode.toString(8)}`;
            await this.send(AdbSyncStringRequest, {
                id: AdbSyncRequestId.Send,
                data: pathAndMode
            });

            let chunkReader: Iterable<ArrayBuffer> | AsyncIterable<ArrayBuffer>;
            if ('length' in file) {
                chunkReader = chunkArray(file, packetSize);
            } else if ('byteLength' in file) {
                chunkReader = chunkArrayBuffer(file, packetSize);
            } else {
                chunkReader = chunkAsyncIterable(file, packetSize);
            }

            for await (const buffer of chunkReader) {
                await this.send(AdbSyncBufferRequest, {
                    id: AdbSyncRequestId.Data,
                    data: buffer,
                });
            }

            await this.send(AdbSyncNumberRequest, {
                id: AdbSyncRequestId.Send,
                arg: mtime
            });
        } finally {
            this.sendLock.notify();
        }
    }

    public dispose() {
        super.dispose();
        this.stream.close();
    }
}
