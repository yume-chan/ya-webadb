import type { ReadableStream } from "@yume-chan/stream-extra";
import { ChunkStream, WritableStream } from "@yume-chan/stream-extra";
import Struct, { placeholder } from "@yume-chan/struct";

import { AdbSyncRequestId, adbSyncWriteRequest } from "./request.js";
import { AdbSyncResponseId, adbSyncReadResponse } from "./response.js";
import type { AdbSyncSocket } from "./socket.js";
import { LinuxFileType } from "./stat.js";

export const AdbSyncOkResponse = new Struct({ littleEndian: true }).uint32(
    "unused"
);

export const ADB_SYNC_MAX_PACKET_SIZE = 64 * 1024;

export async function adbSyncPushV1(
    socket: AdbSyncSocket,
    filename: string,
    file: ReadableStream<Uint8Array>,
    mode: number = (LinuxFileType.File << 12) | 0o666,
    mtime: number = (Date.now() / 1000) | 0,
    packetSize: number = ADB_SYNC_MAX_PACKET_SIZE
) {
    const locked = await socket.lock();
    try {
        const pathAndMode = `${filename},${mode.toString()}`;
        await adbSyncWriteRequest(locked, AdbSyncRequestId.Send, pathAndMode);

        await file.pipeThrough(new ChunkStream(packetSize, true)).pipeTo(
            new WritableStream({
                write: async (chunk) => {
                    await adbSyncWriteRequest(
                        locked,
                        AdbSyncRequestId.Data,
                        chunk
                    );
                },
            })
        );

        await adbSyncWriteRequest(locked, AdbSyncRequestId.Done, mtime);
        await adbSyncReadResponse(
            locked,
            AdbSyncResponseId.Ok,
            AdbSyncOkResponse
        );
    } finally {
        locked.release();
    }
}

export enum AdbSyncSendV2Flags {
    None = 0,
    Brotli = 1,
    /**
     * 2
     */
    Lz4 = 1 << 1,
    /**
     * 4
     */
    Zstd = 1 << 2,
    /**
     * 0x80000000
     */
    DryRun = (1 << 31) >>> 0,
}

export const AdbSyncSendV2Request = new Struct({ littleEndian: true })
    .uint32("id", placeholder<AdbSyncRequestId>())
    .uint32("mode")
    .uint32("flags", placeholder<AdbSyncSendV2Flags>());

export async function adbSyncPushV2(
    socket: AdbSyncSocket,
    filename: string,
    file: ReadableStream<Uint8Array>,
    mode: number = (LinuxFileType.File << 12) | 0o666,
    mtime: number = (Date.now() / 1000) | 0,
    packetSize: number = ADB_SYNC_MAX_PACKET_SIZE
) {
    const locked = await socket.lock();
    try {
        await adbSyncWriteRequest(locked, AdbSyncRequestId.SendV2, filename);

        await locked.write(
            AdbSyncSendV2Request.serialize({
                id: AdbSyncRequestId.SendV2,
                mode,
                flags: 0,
            })
        );

        await file.pipeThrough(new ChunkStream(packetSize, true)).pipeTo(
            new WritableStream({
                write: async (chunk) => {
                    await adbSyncWriteRequest(
                        locked,
                        AdbSyncRequestId.Data,
                        chunk
                    );
                },
            })
        );

        await adbSyncWriteRequest(locked, AdbSyncRequestId.Done, mtime);
        await adbSyncReadResponse(
            locked,
            AdbSyncResponseId.Ok,
            AdbSyncOkResponse
        );
    } finally {
        locked.release();
    }
}

export function adbSyncPush(
    v2: boolean,
    socket: AdbSyncSocket,
    filename: string,
    file: ReadableStream<Uint8Array>,
    mode: number = (LinuxFileType.File << 12) | 0o666,
    mtime: number = (Date.now() / 1000) | 0,
    packetSize: number = ADB_SYNC_MAX_PACKET_SIZE
) {
    if (v2) {
        return adbSyncPushV2(socket, filename, file, mode, mtime, packetSize);
    } else {
        return adbSyncPushV1(socket, filename, file, mode, mtime, packetSize);
    }
}
