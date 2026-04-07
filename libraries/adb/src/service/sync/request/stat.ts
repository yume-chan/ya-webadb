import type { StructValue } from "@yume-chan/struct";
import { struct, u32, u64 } from "@yume-chan/struct";

import type { AndroidSyscallErrorCode, LinuxFileType } from "../android.js";
import { AndroidSyscallErrorNameMap } from "../android.js";
import { RequestId, ResponseId } from "../id/index.js";
import type { SocketPool } from "../socket-pool.js";
import { Error as AdbSyncError } from "../socket.js";

export const LstatResponse = struct(
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
                throw new AdbSyncError("lstat error");
            }
            return value;
        },
    },
);

export type LstatResponse = StructValue<typeof LstatResponse>;

export function lstatV1(
    pool: SocketPool,
    path: string,
): Promise<LstatResponse> {
    return pool.withSocket(async (socket) => {
        await socket.writeRequest(RequestId.Lstat, path);
        return await socket.readResponse(ResponseId.Lstat, LstatResponse);
    });
}

export const StatResponse = struct(
    {
        error: u32<AndroidSyscallErrorCode>(),
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
                throw new AdbSyncError(AndroidSyscallErrorNameMap[value.error]);
            }
            return value;
        },
    },
);

export type StatResponse = StructValue<typeof StatResponse>;

export function lstatV2(pool: SocketPool, path: string) {
    return pool.withSocket(async (socket) => {
        await socket.writeRequest(RequestId.LstatV2, path);
        return await socket.readResponse(ResponseId.LstatV2, StatResponse);
    });
}

export async function lstat(
    pool: SocketPool,
    path: string,
    { version }: { version: 1 | 2 },
): Promise<Stat> {
    if (version === 2) {
        return await lstatV2(pool, path);
    } else {
        const response = await lstatV1(pool, path);
        return {
            mode: response.mode,
            // Convert to `BigInt` to make it compatible with `StatResponse`
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
}

export interface Stat {
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

export function stat(pool: SocketPool, path: string): Promise<StatResponse> {
    return pool.withSocket(async (socket) => {
        await socket.writeRequest(RequestId.Stat, path);
        return await socket.readResponse(ResponseId.Stat, StatResponse);
    });
}
