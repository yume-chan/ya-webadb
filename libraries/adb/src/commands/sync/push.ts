import type { Consumable, ReadableStream } from "@yume-chan/stream-extra";
import {
    AbortController,
    ConsumableWritableStream,
    DistributionStream,
} from "@yume-chan/stream-extra";
import Struct, { placeholder } from "@yume-chan/struct";

import { AdbSyncRequestId, adbSyncWriteRequest } from "./request.js";
import { AdbSyncResponseId, adbSyncReadResponse } from "./response.js";
import type { AdbSyncSocket, AdbSyncSocketLocked } from "./socket.js";
import { LinuxFileType } from "./stat.js";

const NOOP = () => {
    // no-op
};

export const ADB_SYNC_MAX_PACKET_SIZE = 64 * 1024;

export interface AdbSyncPushV1Options {
    socket: AdbSyncSocket;
    filename: string;
    file: ReadableStream<Consumable<Uint8Array>>;
    mode?: number;
    mtime?: number;
    packetSize?: number;
}

export const AdbSyncOkResponse = new Struct({ littleEndian: true }).uint32(
    "unused"
);

async function pipeFile(
    locked: AdbSyncSocketLocked,
    file: ReadableStream<Consumable<Uint8Array>>,
    packetSize: number,
    mtime: number
) {
    // Read and write in parallel,
    // allow error response to abort the write.
    const abortController = new AbortController();
    file.pipeThrough(new DistributionStream(packetSize, true))
        .pipeTo(
            new ConsumableWritableStream({
                write: async (chunk) => {
                    await adbSyncWriteRequest(
                        locked,
                        AdbSyncRequestId.Data,
                        chunk
                    );
                },
            }),
            { signal: abortController.signal }
        )
        .then(async () => {
            await adbSyncWriteRequest(locked, AdbSyncRequestId.Done, mtime);
            await locked.flush();
        }, NOOP);

    await adbSyncReadResponse(
        locked,
        AdbSyncResponseId.Ok,
        AdbSyncOkResponse
    ).catch((e) => {
        abortController.abort();
        throw e;
    });
}

export async function adbSyncPushV1({
    socket,
    filename,
    file,
    mode = (LinuxFileType.File << 12) | 0o666,
    mtime = (Date.now() / 1000) | 0,
    packetSize = ADB_SYNC_MAX_PACKET_SIZE,
}: AdbSyncPushV1Options) {
    const locked = await socket.lock();
    try {
        const pathAndMode = `${filename},${mode.toString()}`;
        await adbSyncWriteRequest(locked, AdbSyncRequestId.Send, pathAndMode);
        await pipeFile(locked, file, packetSize, mtime);
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

export interface AdbSyncPushV2Options extends AdbSyncPushV1Options {
    dryRun?: boolean;
}

export const AdbSyncSendV2Request = new Struct({ littleEndian: true })
    .uint32("id", placeholder<AdbSyncRequestId>())
    .uint32("mode")
    .uint32("flags", placeholder<AdbSyncSendV2Flags>());

export async function adbSyncPushV2({
    socket,
    filename,
    file,
    mode = (LinuxFileType.File << 12) | 0o666,
    mtime = (Date.now() / 1000) | 0,
    packetSize = ADB_SYNC_MAX_PACKET_SIZE,
    dryRun = false,
}: AdbSyncPushV2Options) {
    const locked = await socket.lock();
    try {
        await adbSyncWriteRequest(locked, AdbSyncRequestId.SendV2, filename);

        let flags: AdbSyncSendV2Flags = AdbSyncSendV2Flags.None;
        if (dryRun) {
            flags |= AdbSyncSendV2Flags.DryRun;
        }
        await locked.write(
            AdbSyncSendV2Request.serialize({
                id: AdbSyncRequestId.SendV2,
                mode,
                flags,
            })
        );

        await pipeFile(locked, file, packetSize, mtime);
    } finally {
        locked.release();
    }
}

export interface AdbSyncPushOptions extends AdbSyncPushV2Options {
    v2: boolean;
}

export function adbSyncPush(options: AdbSyncPushOptions) {
    if (options.v2) {
        return adbSyncPushV2(options);
    }

    if (options.dryRun) {
        throw new Error("dryRun is not supported in v1");
    }

    return adbSyncPushV1(options);
}
