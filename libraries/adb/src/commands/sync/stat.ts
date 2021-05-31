import Struct, { placeholder } from '@yume-chan/struct';
import { AdbBufferedStream } from '../../stream';
import { AdbSyncRequestId, adbSyncWriteRequest } from './request';
import { adbSyncReadResponse, AdbSyncResponseId } from './response';

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
        .postDeserialize((object) => {
            if (object.mode === 0 &&
                object.size === 0 &&
                object.mtime === 0
            ) {
                throw new Error('lstat failed');
            }
        });

export type AdbSyncLstatResponse = typeof AdbSyncLstatResponse['TDeserializeResult'];

export enum AdbSyncStatErrorCode {
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
        .uint32('error', placeholder<AdbSyncStatErrorCode>())
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
        .postDeserialize((object) => {
            if (object.error) {
                throw new Error(AdbSyncStatErrorCode[object.error]);
            }
        });

export type AdbSyncStatResponse = typeof AdbSyncStatResponse['TDeserializeResult'];

const StatResponseType = {
    [AdbSyncResponseId.Stat]: AdbSyncStatResponse,
};

const LstatResponseType = {
    [AdbSyncResponseId.Lstat]: AdbSyncLstatResponse,
};

const Lstat2ResponseType = {
    [AdbSyncResponseId.Lstat2]: AdbSyncStatResponse,
};

export async function adbSyncLstat(
    stream: AdbBufferedStream,
    path: string,
    v2: boolean,
): Promise<AdbSyncLstatResponse | AdbSyncStatResponse> {
    let requestId: AdbSyncRequestId.Lstat | AdbSyncRequestId.Lstat2;
    let responseType: typeof LstatResponseType | typeof Lstat2ResponseType;

    if (v2) {
        requestId = AdbSyncRequestId.Lstat2;
        responseType = Lstat2ResponseType;
    } else {
        requestId = AdbSyncRequestId.Lstat;
        responseType = LstatResponseType;
    }

    await adbSyncWriteRequest(stream, requestId, path);
    return adbSyncReadResponse(stream, responseType);
}

export async function adbSyncStat(
    stream: AdbBufferedStream,
    path: string,
): Promise<AdbSyncStatResponse> {
    await adbSyncWriteRequest(stream, AdbSyncRequestId.Stat, path);
    return adbSyncReadResponse(stream, StatResponseType);
}
