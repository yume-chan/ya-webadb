import { ReadableStream } from "@yume-chan/stream-extra";
import type { StructValue } from "@yume-chan/struct";
import { buffer, struct, u32 } from "@yume-chan/struct";

import { RequestId, ResponseId } from "../id/index.js";
import type { Socket } from "../socket.js";

export const DataResponse = struct(
    { data: buffer(u32) },
    { littleEndian: true },
);

export type DataResponse = StructValue<typeof DataResponse>;

export async function* generator(
    socket: Socket,
    path: string,
): AsyncGenerator<Uint8Array, void, void> {
    const locked = await socket.lock();
    // False positive, see https://github.com/eslint/eslint/issues/20583
    // eslint-disable-next-line no-useless-assignment
    let done = false;
    try {
        await locked.writeRequest(RequestId.Receive, path);
        for await (const packet of locked.readResponses(
            ResponseId.Data,
            DataResponse,
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
            for await (const packet of locked.readResponses(
                ResponseId.Data,
                DataResponse,
            )) {
                void packet;
            }
        }
        locked.release();
    }
}

export function stream(
    socket: Socket,
    path: string,
): ReadableStream<Uint8Array> {
    return ReadableStream.from(generator(socket, path));
}
