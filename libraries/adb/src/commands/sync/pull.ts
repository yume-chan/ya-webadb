import { ReadableStream } from "@yume-chan/stream-extra";
import type { StructValue } from "@yume-chan/struct";
import { buffer, struct, u32 } from "@yume-chan/struct";

import { AdbSyncRequestId, adbSyncWriteRequest } from "./request.js";
import { adbSyncReadResponses, AdbSyncResponseId } from "./response.js";
import type { AdbSyncSocket } from "./socket.js";

export const AdbSyncDataResponse = struct(
    { data: buffer(u32) },
    { littleEndian: true },
);

export type AdbSyncDataResponse = StructValue<typeof AdbSyncDataResponse>;

export async function* adbSyncPullGenerator(
    socket: AdbSyncSocket,
    path: string,
): AsyncGenerator<Uint8Array, void, void> {
    const locked = await socket.lock();
    let done = false;
    try {
        await adbSyncWriteRequest(locked, AdbSyncRequestId.Receive, path);
        for await (const packet of adbSyncReadResponses(
            locked,
            AdbSyncResponseId.Data,
            AdbSyncDataResponse,
        )) {
            yield packet.data;
        }
        done = true;
    } catch (e) {
        done = true;
        throw e;
    } finally {
        if (!done) {
            // sync pull can't be cancelled, so we have to read all data
            for await (const packet of adbSyncReadResponses(
                locked,
                AdbSyncResponseId.Data,
                AdbSyncDataResponse,
            )) {
                void packet;
            }
        }
        locked.release();
    }
}

export function adbSyncPull(
    socket: AdbSyncSocket,
    path: string,
): ReadableStream<Uint8Array> {
    return ReadableStream.from(adbSyncPullGenerator(socket, path));
}
