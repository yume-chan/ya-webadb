import type { StructValue } from "@yume-chan/struct";
import { extend, string, u32 } from "@yume-chan/struct";

import { AdbSyncRequestId, adbSyncWriteRequest } from "./request.js";
import { AdbSyncResponseId, adbSyncReadResponses } from "./response.js";
import type { AdbSyncSocket } from "./socket.js";
import type { AdbSyncStat } from "./stat.js";
import {
    AdbSyncLstatResponse,
    AdbSyncStatErrorCode,
    AdbSyncStatResponse,
} from "./stat.js";

export interface AdbSyncEntry extends AdbSyncStat {
    name: string;
}

export const AdbSyncEntryResponse = extend(AdbSyncLstatResponse, {
    name: string(u32),
});

export type AdbSyncEntryResponse = StructValue<typeof AdbSyncEntryResponse>;

export const AdbSyncEntry2Response = extend(AdbSyncStatResponse, {
    name: string(u32),
});

export type AdbSyncEntry2Response = StructValue<typeof AdbSyncEntry2Response>;

export async function* adbSyncOpenDirV2(
    socket: AdbSyncSocket,
    path: string,
): AsyncGenerator<AdbSyncEntry2Response, void, void> {
    const locked = await socket.lock();
    try {
        await adbSyncWriteRequest(locked, AdbSyncRequestId.ListV2, path);
        for await (const item of adbSyncReadResponses(
            locked,
            AdbSyncResponseId.Entry2,
            AdbSyncEntry2Response,
        )) {
            // `LST2` can return error codes for failed `lstat` calls.
            // `LIST` just ignores them.
            // But they only contain `name` so still pretty useless.
            if (item.error !== AdbSyncStatErrorCode.SUCCESS) {
                continue;
            }
            yield item;
        }
    } finally {
        locked.release();
    }
}

export async function* adbSyncOpenDirV1(
    socket: AdbSyncSocket,
    path: string,
): AsyncGenerator<AdbSyncEntryResponse, void, void> {
    const locked = await socket.lock();
    try {
        await adbSyncWriteRequest(locked, AdbSyncRequestId.List, path);
        for await (const item of adbSyncReadResponses(
            locked,
            AdbSyncResponseId.Entry,
            AdbSyncEntryResponse,
        )) {
            yield item;
        }
    } finally {
        locked.release();
    }
}

export async function* adbSyncOpenDir(
    socket: AdbSyncSocket,
    path: string,
    v2: boolean,
): AsyncGenerator<AdbSyncEntry, void, void> {
    if (v2) {
        yield* adbSyncOpenDirV2(socket, path);
    } else {
        for await (const item of adbSyncOpenDirV1(socket, path)) {
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
