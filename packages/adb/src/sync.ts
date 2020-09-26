import { AutoDisposable } from '@yume-chan/event';
import { placeholder, Struct, StructDeserializationContext, StructInitType, StructValueType } from '@yume-chan/struct';
import { Adb } from './adb';
import { AdbFeatures } from './features';
import { AdbBufferedStream, AdbStream } from './stream';
import { AutoResetEvent } from './utils';

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

export type AdbSyncNumberRequestId =
    AdbSyncRequestId.Done;

export type AdbSyncStringRequestId =
    AdbSyncRequestId.List |
    AdbSyncRequestId.Send |
    AdbSyncRequestId.Lstat |
    AdbSyncRequestId.Stat |
    AdbSyncRequestId.Lstat2 |
    AdbSyncRequestId.Receive;

const AdbSyncStringRequest =
    new Struct({ littleEndian: true })
        .string('id', { length: 4 })
        .uint32('valueLength')
        .string('value', { lengthField: 'valueLength' });

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

export class AdbSync extends AutoDisposable {
    private stream: AdbBufferedStream;

    private adb: Adb;

    public get supportStat(): boolean {
        return this.adb.features!.includes(AdbFeatures.StatV2);
    }

    private sendLock = this.addDisposable(new AutoResetEvent());

    public constructor(stream: AdbStream, adb: Adb) {
        super();

        this.stream = new AdbBufferedStream(stream);
        this.adb = adb;
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

            await this.write(AdbSyncStringRequest, { id: requestId, value: path });
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
            await this.write(AdbSyncStringRequest, { id: AdbSyncRequestId.Stat, value: path });
            const response = await readResponse(this.stream, AdbSyncStatResponse.size);
            if (response.id !== AdbSyncResponseId.Stat) {
                throw new Error('Unexpected response id');
            }
            return response;
        } finally {
            this.sendLock.notify();
        }
    }

    public async *opendir(path: string) {
        await this.sendLock.wait();

        try {
            await this.write(AdbSyncStringRequest, { id: AdbSyncRequestId.List, value: path });

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

    public async *receive(path: string): AsyncGenerator<ArrayBuffer, void, void> {
        await this.sendLock.wait();

        try {
            await this.write(AdbSyncStringRequest, { id: AdbSyncRequestId.Receive, value: path });
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

    public dispose() {
        super.dispose();
        this.stream.close();
    }

    private write<T extends Struct<object, object, object, unknown>>(
        type: T,
        value: StructInitType<T>
    ) {
        return this.stream.write(type.serialize(value, this.stream.backend));
    }
}
