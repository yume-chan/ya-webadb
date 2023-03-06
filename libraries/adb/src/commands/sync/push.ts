import type { ReadableStream } from "@yume-chan/stream-extra";
import { ChunkStream, WritableStream } from "@yume-chan/stream-extra";
import Struct, { placeholder } from "@yume-chan/struct";

import { AdbSyncRequestId, adbSyncWriteRequest } from "./request.js";
import { AdbSyncResponseId, adbSyncReadResponse } from "./response.js";
import type { AdbSyncSocket } from "./socket.js";
import { LinuxFileType } from "./stat.js";

export const ADB_SYNC_MAX_PACKET_SIZE = 64 * 1024;

export interface AdbSyncPushV1Options {
    socket: AdbSyncSocket;
    filename: string;
    file: ReadableStream<Uint8Array>;
    mode?: number;
    mtime?: number;
    packetSize?: number;
}

export const AdbSyncPushV1DefaultOptions: {
    [K in keyof AdbSyncPushV1Options as Pick<
        AdbSyncPushV1Options,
        K
    > extends Required<Pick<AdbSyncPushV1Options, K>>
        ? never
        : K]-?: Exclude<AdbSyncPushV1Options[K], undefined>;
} = {
    mode: (LinuxFileType.File << 12) | 0o666,
    mtime: (Date.now() / 1000) | 0,
    packetSize: ADB_SYNC_MAX_PACKET_SIZE,
};

export const AdbSyncOkResponse = new Struct({ littleEndian: true }).uint32(
    "unused"
);

export async function adbSyncPushV1(options: AdbSyncPushV1Options) {
    const { socket, filename, file, mode, mtime, packetSize } = {
        ...AdbSyncPushV1DefaultOptions,
        ...options,
    };
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

export interface AdbSyncPushV2Options extends AdbSyncPushV1Options {
    dryRun?: boolean;
}

export const AdbSyncPushV2DefaultOptions: {
    [K in keyof AdbSyncPushV2Options as Pick<
        AdbSyncPushV2Options,
        K
    > extends Required<Pick<AdbSyncPushV2Options, K>>
        ? never
        : K]-?: Exclude<AdbSyncPushV2Options[K], undefined>;
} = {
    ...AdbSyncPushV1DefaultOptions,
    dryRun: false,
};

export const AdbSyncSendV2Request = new Struct({ littleEndian: true })
    .uint32("id", placeholder<AdbSyncRequestId>())
    .uint32("mode")
    .uint32("flags", placeholder<AdbSyncSendV2Flags>());

export async function adbSyncPushV2(options: AdbSyncPushV2Options) {
    const { socket, filename, file, mode, mtime, packetSize, dryRun } = {
        ...AdbSyncPushV2DefaultOptions,
        ...options,
    };
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

export interface AdbSyncPushOptions extends AdbSyncPushV2Options {
    v2: boolean;
}

export function adbSyncPush(options: AdbSyncPushOptions) {
    if (options.v2) {
        return adbSyncPushV2(options);
    } else if (options.dryRun) {
        throw new Error("dryRun is not supported in v1");
    } else {
        return adbSyncPushV1(options);
    }
}
