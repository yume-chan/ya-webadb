import type { ReadableStream } from "@yume-chan/stream-extra";
import {
    AbortController,
    DistributionStream,
    MaybeConsumable,
} from "@yume-chan/stream-extra";
import { struct, u32 } from "@yume-chan/struct";

import { NOOP } from "../../utils/index.js";

import { AdbSyncRequestId, adbSyncWriteRequest } from "./request.js";
import { AdbSyncResponseId, adbSyncReadResponse } from "./response.js";
import type { AdbSyncSocket, AdbSyncSocketLocked } from "./socket.js";
import { LinuxFileType } from "./stat.js";

export const ADB_SYNC_MAX_PACKET_SIZE = 64 * 1024;

export interface AdbSyncPushV1Options {
    socket: AdbSyncSocket;
    filename: string;
    file: ReadableStream<MaybeConsumable<Uint8Array>>;
    type?: LinuxFileType;
    permission?: number;
    mtime?: number;
    packetSize?: number;
}

export const AdbSyncOkResponse = struct(
    { unused: u32 },
    { littleEndian: true },
);

async function pipeFileData(
    locked: AdbSyncSocketLocked,
    file: ReadableStream<MaybeConsumable<Uint8Array>>,
    packetSize: number,
    mtime: number,
) {
    // Read and write in parallel,
    // allow error response to abort the write.
    const abortController = new AbortController();
    file.pipeThrough(new DistributionStream(packetSize, true))
        .pipeTo(
            new MaybeConsumable.WritableStream({
                write(chunk) {
                    return adbSyncWriteRequest(
                        locked,
                        AdbSyncRequestId.Data,
                        chunk,
                    );
                },
            }),
            { signal: abortController.signal },
        )
        .then(async () => {
            await adbSyncWriteRequest(locked, AdbSyncRequestId.Done, mtime);
            await locked.flush();
        }, NOOP);

    await adbSyncReadResponse(
        locked,
        AdbSyncResponseId.Ok,
        AdbSyncOkResponse,
    ).catch((e) => {
        abortController.abort();
        throw e;
    });
}

export async function adbSyncPushV1({
    socket,
    filename,
    file,
    type = LinuxFileType.File,
    permission = 0o666,
    mtime = (Date.now() / 1000) | 0,
    packetSize = ADB_SYNC_MAX_PACKET_SIZE,
}: AdbSyncPushV1Options) {
    const locked = await socket.lock();
    try {
        const mode = (type << 12) | permission;
        const pathAndMode = `${filename},${mode.toString()}`;
        await adbSyncWriteRequest(locked, AdbSyncRequestId.Send, pathAndMode);
        await pipeFileData(locked, file, packetSize, mtime);
    } finally {
        locked.release();
    }
}

export const AdbSyncSendV2Flags = {
    None: 0,
    Brotli: 1,
    /**
     * 2
     */
    Lz4: 1 << 1,
    /**
     * 4
     */
    Zstd: 1 << 2,
    DryRun: 0x80000000,
} as const;

export type AdbSyncSendV2Flags =
    (typeof AdbSyncSendV2Flags)[keyof typeof AdbSyncSendV2Flags];

export interface AdbSyncPushV2Options extends AdbSyncPushV1Options {
    /**
     * Don't write the file to disk. Requires the `sendrecv_v2` feature.
     *
     * It was used during ADB development to benchmark the performance of
     * compression algorithms.
     */
    dryRun?: boolean;
}

export const AdbSyncSendV2Request = struct(
    { id: u32, mode: u32, flags: u32<AdbSyncSendV2Flags>() },
    { littleEndian: true },
);

export async function adbSyncPushV2({
    socket,
    filename,
    file,
    type = LinuxFileType.File,
    permission = 0o666,
    mtime = (Date.now() / 1000) | 0,
    packetSize = ADB_SYNC_MAX_PACKET_SIZE,
    dryRun = false,
}: AdbSyncPushV2Options) {
    const locked = await socket.lock();
    try {
        await adbSyncWriteRequest(locked, AdbSyncRequestId.SendV2, filename);

        const mode = (type << 12) | permission;
        let flags: AdbSyncSendV2Flags = AdbSyncSendV2Flags.None;
        if (dryRun) {
            flags |= AdbSyncSendV2Flags.DryRun;
        }
        await locked.write(
            AdbSyncSendV2Request.serialize({
                id: AdbSyncRequestId.SendV2,
                mode,
                flags,
            }),
        );

        await pipeFileData(locked, file, packetSize, mtime);
    } finally {
        locked.release();
    }
}

export interface AdbSyncPushOptions extends AdbSyncPushV2Options {
    /**
     * Whether to use the v2 protocol. Requires the `sendrecv_v2` feature.
     */
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
