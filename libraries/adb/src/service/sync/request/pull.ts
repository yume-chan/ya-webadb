import type { TransformStream } from "@yume-chan/stream-extra";
import { InspectStream, ReadableStream } from "@yume-chan/stream-extra";
import type { StructValue } from "@yume-chan/struct";
import { buffer, struct, u32 } from "@yume-chan/struct";

import { RequestId, ResponseId } from "../id/index.js";
import { Compression } from "../index-ns.js";
import type { SocketPool } from "../socket-pool.js";
import { Error as AdbSyncError } from "../socket.js";

import { SyncFlag } from "./flag.js";

export const DataResponse = struct(
    { data: buffer(u32) },
    { littleEndian: true },
);

export type DataResponse = StructValue<typeof DataResponse>;

export interface ReceiveSession {
    /**
     * The readable stream to read the file content from.
     */
    readable: ReadableStream<Uint8Array>;
    /**
     * Gets the number of bytes read from {@link readable}.
     */
    bytesRead: number;
    /**
     * When using Pull v2, gets the compression format used (might be `None`).
     *
     * When using Pull v1, this will always be `undefined`.
     */
    compression?: Compression.Format | undefined;
    /**
     * When using Pull v2, gets the size of the compressed data received from the device.
     * Might be same as {@link bytesRead} if no compression was applied.
     */
    bytesCompressed: number;
}

export function receiveV1(pool: SocketPool, path: string): ReceiveSession {
    let bytesReceived = 0;
    return {
        readable: ReadableStream.from(
            pool.withSocketGenerator(async function* (socket) {
                await socket.writeRequest(RequestId.Receive, path);

                for await (const packet of socket.readResponses(
                    ResponseId.Data,
                    DataResponse,
                )) {
                    bytesReceived += packet.data.length;
                    yield packet.data;
                }
            }),
        ),
        get bytesRead() {
            return bytesReceived;
        },
        compression: undefined,
        get bytesCompressed() {
            return bytesReceived;
        },
    };
}

export function receiveV2(
    pool: SocketPool,
    path: string,
    compression?: Compression.Format,
): ReceiveSession {
    let flags: SyncFlag = SyncFlag.None;
    let decompressStream: TransformStream<Uint8Array, Uint8Array> | undefined;
    switch (compression) {
        case Compression.Format.Brotli:
            flags |= SyncFlag.Brotli;
            decompressStream = Compression.createDecompressionStream(
                Compression.Format.Brotli,
            );
            break;
        case Compression.Format.Lz4:
            flags |= SyncFlag.Lz4;
            decompressStream = Compression.createDecompressionStream(
                Compression.Format.Lz4,
            );
            break;
        case Compression.Format.Zstd:
            flags |= SyncFlag.Zstd;
            decompressStream = Compression.createDecompressionStream(
                Compression.Format.Zstd,
            );
            break;
    }

    let bytesReceived = 0;
    const raw = ReadableStream.from(
        pool.withSocketGenerator(async function* (socket) {
            await socket.writeRequest(RequestId.ReceiveV2, path);
            await socket.writeRequest(RequestId.ReceiveV2, flags);

            for await (const packet of socket.readResponses(
                ResponseId.Data,
                DataResponse,
            )) {
                bytesReceived += packet.data.length;
                yield packet.data;
            }
        }),
    );

    if (decompressStream) {
        let bytesRead = 0;
        return {
            readable: raw.pipeThrough(decompressStream).pipeThrough(
                new InspectStream((chunk) => {
                    bytesRead += chunk.length;
                }),
            ),
            get bytesRead() {
                return bytesRead;
            },
            compression,
            get bytesCompressed() {
                return bytesReceived;
            },
        };
    }

    return {
        readable: raw,
        get bytesRead() {
            return bytesReceived;
        },
        compression: Compression.Format.None,
        get bytesCompressed() {
            return bytesReceived;
        },
    };
}

export function receive(
    version: 1 | 2,
    pool: SocketPool,
    path: string,
    compression?: Compression.Format,
) {
    if (version === 2) {
        return receiveV2(pool, path, compression);
    }

    if (compression !== undefined && compression !== Compression.Format.None) {
        throw new AdbSyncError("compression is not supported in v1");
    }

    return receiveV1(pool, path);
}
