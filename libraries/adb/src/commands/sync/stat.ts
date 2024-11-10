import type { StructValue } from "@yume-chan/struct";
import { struct, u32, u64 } from "@yume-chan/struct";

import { AdbSyncRequestId, adbSyncWriteRequest } from "./request.js";
import { AdbSyncResponseId, adbSyncReadResponse } from "./response.js";
import type { AdbSyncSocket } from "./socket.js";

// https://github.com/python/cpython/blob/4e581d64b8aff3e2eda99b12f080c877bb78dfca/Lib/stat.py#L36
export const LinuxFileType = {
    Directory: 0o04,
    File: 0o10,
    Link: 0o12,
} as const;

export type LinuxFileType = (typeof LinuxFileType)[keyof typeof LinuxFileType];

export interface AdbSyncStat {
    mode: number;
    size: bigint;
    mtime: bigint;
    get type(): LinuxFileType;
    get permission(): number;

    uid?: number;
    gid?: number;
    atime?: bigint;
    ctime?: bigint;
}

export const AdbSyncLstatResponse = struct(
    { mode: u32, size: u32, mtime: u32 },
    {
        littleEndian: true,
        extra: {
            get type(): LinuxFileType {
                return (this.mode >> 12) as LinuxFileType;
            },
            get permission(): number {
                return this.mode & 0b00001111_11111111;
            },
        },
        postDeserialize(value) {
            if (value.mode === 0 && value.size === 0 && value.mtime === 0) {
                throw new Error("lstat error");
            }
            return value;
        },
    },
);

export type AdbSyncLstatResponse = StructValue<typeof AdbSyncLstatResponse>;

export const AdbSyncStatErrorCode = {
    SUCCESS: 0,
    EACCES: 13,
    EEXIST: 17,
    EFAULT: 14,
    EFBIG: 27,
    EINTR: 4,
    EINVAL: 22,
    EIO: 5,
    EISDIR: 21,
    ELOOP: 40,
    EMFILE: 24,
    ENAMETOOLONG: 36,
    ENFILE: 23,
    ENOENT: 2,
    ENOMEM: 12,
    ENOSPC: 28,
    ENOTDIR: 20,
    EOVERFLOW: 75,
    EPERM: 1,
    EROFS: 30,
    ETXTBSY: 26,
} as const;

export type AdbSyncStatErrorCode =
    (typeof AdbSyncStatErrorCode)[keyof typeof AdbSyncStatErrorCode];

const AdbSyncStatErrorName = /* #__PURE__ */ (() =>
    Object.fromEntries(
        Object.entries(AdbSyncStatErrorCode).map(([key, value]) => [
            value,
            key,
        ]),
    ))();

export const AdbSyncStatResponse = struct(
    {
        error: u32<AdbSyncStatErrorCode>(),
        dev: u64,
        ino: u64,
        mode: u32,
        nlink: u32,
        uid: u32,
        gid: u32,
        size: u64,
        atime: u64,
        mtime: u64,
        ctime: u64,
    },
    {
        littleEndian: true,
        extra: {
            get type(): LinuxFileType {
                return (this.mode >> 12) as LinuxFileType;
            },
            get permission(): number {
                return this.mode & 0b00001111_11111111;
            },
        },
        postDeserialize(value) {
            if (value.error) {
                throw new Error(AdbSyncStatErrorName[value.error]);
            }
            return value;
        },
    },
);

export type AdbSyncStatResponse = StructValue<typeof AdbSyncStatResponse>;

export async function adbSyncLstat(
    socket: AdbSyncSocket,
    path: string,
    v2: boolean,
): Promise<AdbSyncStat> {
    const locked = await socket.lock();
    try {
        if (v2) {
            await adbSyncWriteRequest(locked, AdbSyncRequestId.LstatV2, path);
            return await adbSyncReadResponse(
                locked,
                AdbSyncResponseId.Lstat2,
                AdbSyncStatResponse,
            );
        } else {
            await adbSyncWriteRequest(locked, AdbSyncRequestId.Lstat, path);
            const response = await adbSyncReadResponse(
                locked,
                AdbSyncResponseId.Lstat,
                AdbSyncLstatResponse,
            );
            return {
                mode: response.mode,
                // Convert to `BigInt` to make it compatible with `AdbSyncStatResponse`
                size: BigInt(response.size),
                mtime: BigInt(response.mtime),
                get type() {
                    return response.type;
                },
                get permission() {
                    return response.permission;
                },
            };
        }
    } finally {
        locked.release();
    }
}

export async function adbSyncStat(
    socket: AdbSyncSocket,
    path: string,
): Promise<AdbSyncStatResponse> {
    const locked = await socket.lock();
    try {
        await adbSyncWriteRequest(locked, AdbSyncRequestId.Stat, path);
        return await adbSyncReadResponse(
            locked,
            AdbSyncResponseId.Stat,
            AdbSyncStatResponse,
        );
    } finally {
        locked.release();
    }
}
