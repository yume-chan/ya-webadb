import { ReadableStream } from "@yume-chan/stream-extra";
import type { StructValue } from "@yume-chan/struct";
import { buffer, struct, u32 } from "@yume-chan/struct";

import { RequestId, ResponseId } from "../id/index.js";
import type { SocketPool } from "../socket-pool.js";
import { Error as AdbSyncError } from "../socket.js";

export const DataResponse = struct(
    { data: buffer(u32) },
    { littleEndian: true },
);

export type DataResponse = StructValue<typeof DataResponse>;

export async function* generator(
    pool: SocketPool,
    path: string,
): AsyncGenerator<Uint8Array, void, void> {
    const socket = await pool.acquire();
    let completed = false;
    let error: unknown;

    try {
        await socket.writeRequest(RequestId.Receive, path);
        for await (const packet of socket.readResponses(
            ResponseId.Data,
            DataResponse,
        )) {
            yield packet.data;
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

export function stream(
    pool: SocketPool,
    path: string,
): ReadableStream<Uint8Array> {
    return ReadableStream.from(generator(pool, path));
}
