import type { ReadableStream } from "@yume-chan/stream-extra";
import {
    AbortController,
    DistributionStream,
    MaybeConsumable,
} from "@yume-chan/stream-extra";
import { struct, u32 } from "@yume-chan/struct";

import { NOOP } from "../../../utils/index.js";
import { LinuxFileType } from "../android.js";
import { Compression } from "../compression/index.js";
import { RequestId, ResponseId } from "../id/index.js";
import type { SocketPool } from "../socket-pool.js";
import type { Socket } from "../socket.js";
import { Error as AdbSyncError } from "../socket.js";

export const MaxPacketSize = 64 * 1024;

export const OkResponse = struct({ unused: u32 }, { littleEndian: true });

// eslint-disable-next-line @typescript-eslint/max-params
async function pipeFileData(
    socket: Socket,
    file: ReadableStream<MaybeConsumable<Uint8Array>>,
    packetSize: number,
    mtime: number,
    compression: Compression.Format,
): Promise<void> {
    if (compression !== Compression.Format.None) {
        const stream = Compression.createCompressionStream(compression);
        void file
            .pipeTo(new MaybeConsumable.WrapWritableStream(stream.writable))
            .catch(NOOP);
        file = stream.readable;
    }

    // Read and write in parallel,
    // allow error response to abort the write.
    const abortController = new AbortController();
    file.pipeThrough(new DistributionStream(packetSize, true))
        .pipeTo(
            new MaybeConsumable.WritableStream({
                write(chunk) {
                    return socket.writeRequest(RequestId.Data, chunk);
                },
            }),
            { signal: abortController.signal },
        )
        .then(async () => {
            await socket.writeRequest(RequestId.Done, mtime);
            await socket.flush();
        }, NOOP);

    try {
        await socket.readResponse(ResponseId.Ok, OkResponse);
    } catch (e) {
        abortController.abort(e);
        throw e;
    }
}

export interface SendV1Options {
    pool: SocketPool;
    filename: string;
    file: ReadableStream<MaybeConsumable<Uint8Array>>;
    type?: LinuxFileType | undefined;
    permission?: number | undefined;
    mtime?: number | undefined;
    packetSize?: number | undefined;
}

export function sendV1({
    pool,
    filename,
    file,
    type = LinuxFileType.File,
    permission = 0o666,
    mtime = (Date.now() / 1000) | 0,
    packetSize = MaxPacketSize,
}: SendV1Options) {
    return pool.withSocket(async (socket) => {
        const mode = (type << 12) | permission;
        const pathAndMode = `${filename},${mode.toString()}`;
        await socket.writeRequest(RequestId.Send, pathAndMode);
        await pipeFileData(
            socket,
            file,
            packetSize,
            mtime,
            Compression.Format.None,
        );
    });
}

export const SendV2Flags = {
    None: 0,
    Brotli: 1,
    Lz4: 2,
    Zstd: 4,
    DryRun: 0x80000000,
} as const;

export type SendV2Flags = (typeof SendV2Flags)[keyof typeof SendV2Flags];

export const SendV2Request = struct(
    { id: u32, mode: u32, flags: u32 },
    { littleEndian: true },
);

export interface SendV2Options extends SendV1Options {
    compression?: Compression.Format | undefined;

    /**
     * Don't write the file to disk. Requires the `sendrecv_v2` feature.
     *
     * It was used during ADB development to benchmark the performance of
     * compression algorithms.
     */
    dryRun?: boolean | undefined;
}

export function sendV2({
    pool,
    filename,
    file,
    type = LinuxFileType.File,
    permission = 0o666,
    mtime = (Date.now() / 1000) | 0,
    packetSize = MaxPacketSize,
    compression = Compression.Format.None,
    dryRun = false,
}: SendV2Options) {
    return pool.withSocket(async (socket) => {
        let flags: SendV2Flags = SendV2Flags.None;
        switch (compression) {
            case Compression.Format.Brotli:
                flags |= SendV2Flags.Brotli;
                break;
            case Compression.Format.Lz4:
                flags |= SendV2Flags.Lz4;
                break;
            case Compression.Format.Zstd:
                flags |= SendV2Flags.Zstd;
                break;
        }
        if (dryRun) {
            flags |= SendV2Flags.DryRun;
        }

        await socket.writeRequest(RequestId.SendV2, filename);
        await socket.write(
            SendV2Request.serialize({
                id: RequestId.SendV2,
                mode: (type << 12) | permission,
                flags,
            }),
        );

        await pipeFileData(socket, file, packetSize, mtime, compression);
    });
}

export interface SendOptions extends SendV2Options {
    version: 1 | 2;
}

export function send(options: SendOptions) {
    if (options.version === 2) {
        return sendV2(options);
    }

    if (options.dryRun) {
        throw new AdbSyncError("dryRun is not supported in v1");
    }

    if (
        options.compression !== undefined &&
        options.compression !== Compression.Format.None
    ) {
        throw new AdbSyncError("compression is not supported in v1");
    }

    return sendV1(options);
}
