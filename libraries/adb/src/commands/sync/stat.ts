import Struct, { placeholder } from "@yume-chan/struct";

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

export const AdbSyncLstatResponse =
    /* #__PURE__ */
    new Struct({ littleEndian: true })
        .int32("mode")
        .int32("size")
        .int32("mtime")
        .extra({
            get type() {
                return (this.mode >> 12) as LinuxFileType;
            },
            get permission() {
                return this.mode & 0b00001111_11111111;
            },
        })
        .postDeserialize((object) => {
            if (object.mode === 0 && object.size === 0 && object.mtime === 0) {
                throw new Error("lstat error");
            }
        });

export type AdbSyncLstatResponse =
    (typeof AdbSyncLstatResponse)["TDeserializeResult"];

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

const AdbSyncStatErrorName =
    /* #__PURE__ */
    Object.fromEntries(
        Object.entries(AdbSyncStatErrorCode).map(([key, value]) => [
            value,
            key,
        ]),
    );

export const AdbSyncStatResponse =
    /* #__PURE__ */
    new Struct({ littleEndian: true })
        .uint32("error", placeholder<AdbSyncStatErrorCode>())
        .uint64("dev")
        .uint64("ino")
        .uint32("mode")
        .uint32("nlink")
        .uint32("uid")
        .uint32("gid")
        .uint64("size")
        .uint64("atime")
        .uint64("mtime")
        .uint64("ctime")
        .extra({
            get type() {
                return (this.mode >> 12) as LinuxFileType;
            },
            get permission() {
                return this.mode & 0b00001111_11111111;
            },
        })
        .postDeserialize((object) => {
            if (object.error) {
                throw new Error(AdbSyncStatErrorName[object.error]);
            }
        });

export type AdbSyncStatResponse =
    (typeof AdbSyncStatResponse)["TDeserializeResult"];

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
