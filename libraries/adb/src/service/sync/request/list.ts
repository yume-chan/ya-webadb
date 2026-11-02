import type { StructValue } from "@yume-chan/struct";
import { extend, string, u32 } from "@yume-chan/struct";

import { AndroidSyscallErrorCode } from "../android.js";
import { RequestId, ResponseId } from "../id/index.js";
import type { SocketPool } from "../socket-pool.js";
import { Error as AdbSyncError } from "../socket.js";

import type { Stat } from "./stat.js";
import { LstatResponse, StatResponse } from "./stat.js";

export const EntryResponse = extend(LstatResponse, {
    name: string(u32),
});

export type EntryResponse = StructValue<typeof EntryResponse>;

export async function* v1(
    pool: SocketPool,
    path: string,
): AsyncGenerator<EntryResponse, void, void> {
    const socket = await pool.acquire();
    let completed = false;
    let error: unknown;

    try {
        await socket.writeRequest(RequestId.List, path);
        yield* socket.readResponses(ResponseId.Entry, EntryResponse);
        completed = true;
    } catch (e) {
        error = e;
        throw e;
    } finally {
        await pool.release(
            socket,
            !(completed || error instanceof AdbSyncError),
        );
    }
}

export const EntryV2Response = extend(StatResponse, {
    name: string(u32),
});

export type EntryV2Response = StructValue<typeof EntryV2Response>;

export async function* v2(
    pool: SocketPool,
    path: string,
): AsyncGenerator<EntryV2Response, void, void> {
    const socket = await pool.acquire();
    let completed = false;
    let error: unknown;

    try {
        await socket.writeRequest(RequestId.ListV2, path);
        for await (const item of socket.readResponses(
            ResponseId.EntryV2,
            EntryV2Response,
        )) {
            // `LST2` can return error codes for failed `lstat` calls.
            // `LIST` just ignores them.
            // But they only contain `name` so still pretty useless.
            if (item.error !== AndroidSyscallErrorCode.SUCCESS) {
                continue;
            }
            yield item;
        }
        completed = true;
    } catch (e) {
        error = e;
        throw e;
    } finally {
        await pool.release(
            socket,
            !(completed || error instanceof AdbSyncError),
        );
    }
}

export interface Entry extends Stat {
    name: string;
}

export async function* opendir(
    pool: SocketPool,
    path: string,
    { version }: { version: 1 | 2 },
): AsyncGenerator<Entry, void, void> {
    if (version === 2) {
        yield* v2(pool, path);
    } else {
        for await (const item of v1(pool, path)) {
            // Convert to same format as `AdbSyncEntry2Response` for easier consumption.
            // However it will add some overhead.
            yield {
                mode: item.mode,
                size: BigInt(item.size),
                mtime: BigInt(item.mtime),
                get type() {
                    return item.type;
                },
                get permission() {
                    return item.permission;
                },
                name: item.name,
            };
        }
    }
}
