import type { ReadableStream } from "@yume-chan/stream-extra";
import {
    AbortController,
    CompressionStream,
    DistributionStream,
    MaybeConsumable,
} from "@yume-chan/stream-extra";
import { struct, u32 } from "@yume-chan/struct";

import { NOOP } from "../../../utils/index.js";
import { LinuxFileType } from "../android.js";
import { Compression } from "../compression/index.js";
import { RequestId, ResponseId } from "../id/index.js";
import type { Socket, SocketLocked } from "../socket.js";

export const MaxPacketSize = 64 * 1024;

export const OkResponse = struct({ unused: u32 }, { littleEndian: true });

// eslint-disable-next-line @typescript-eslint/max-params
async function pipeFileData(
    locked: SocketLocked,
    file: ReadableStream<MaybeConsumable<Uint8Array>>,
    packetSize: number,
    mtime: number,
    compression: Compression.Type,
) {
    switch (compression) {
        case Compression.Type.Brotli: {
            const stream = new CompressionStream("brotli");
            void file
                .pipeTo(new MaybeConsumable.WrapWritableStream(stream.writable))
                .catch(NOOP);
            file = stream.readable;
            break;
        }
        case Compression.Type.Lz4: {
            const stream = new CompressionStream("lz4");
            void file
                .pipeTo(new MaybeConsumable.WrapWritableStream(stream.writable))
                .catch(NOOP);
            file = stream.readable;
            break;
        }
        case Compression.Type.Zstd: {
            const stream = new CompressionStream("zstd");
            void file
                .pipeTo(new MaybeConsumable.WrapWritableStream(stream.writable))
                .catch(NOOP);
            file = stream.readable;
            break;
        }
    }

    // Read and write in parallel,
    // allow error response to abort the write.
    const abortController = new AbortController();
    file.pipeThrough(new DistributionStream(packetSize, true))
        .pipeTo(
            new MaybeConsumable.WritableStream({
                write(chunk) {
                    return locked.writeRequest(RequestId.Data, chunk);
                },
            }),
            { signal: abortController.signal },
        )
        .then(async () => {
            await locked.writeRequest(RequestId.Done, mtime);
            await locked.flush();
        }, NOOP);

    try {
        await locked.readResponse(ResponseId.Ok, OkResponse);
    } catch (e) {
        abortController.abort(e);
        throw e;
    }
}

export interface SendV1Options {
    socket: Socket;
    filename: string;
    file: ReadableStream<MaybeConsumable<Uint8Array>>;
    type?: LinuxFileType | undefined;
    permission?: number | undefined;
    mtime?: number | undefined;
    packetSize?: number | undefined;
}

export async function sendV1({
    socket,
    filename,
    file,
    type = LinuxFileType.File,
    permission = 0o666,
    mtime = (Date.now() / 1000) | 0,
    packetSize = MaxPacketSize,
}: SendV1Options) {
    const locked = await socket.lock();
    try {
        const mode = (type << 12) | permission;
        const pathAndMode = `${filename},${mode.toString()}`;
        await locked.writeRequest(RequestId.Send, pathAndMode);
        await pipeFileData(
            locked,
            file,
            packetSize,
            mtime,
            Compression.Type.None,
        );
    } finally {
        locked.release();
    }
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
    compression?: Compression.Type | undefined;

    /**
     * Don't write the file to disk. Requires the `sendrecv_v2` feature.
     *
     * It was used during ADB development to benchmark the performance of
     * compression algorithms.
     */
    dryRun?: boolean | undefined;
}

export async function sendV2({
    socket,
    filename,
    file,
    type = LinuxFileType.File,
    permission = 0o666,
    mtime = (Date.now() / 1000) | 0,
    packetSize = MaxPacketSize,
    compression = Compression.Type.None,
    dryRun = false,
}: SendV2Options) {
    const locked = await socket.lock();
    try {
        await locked.writeRequest(RequestId.SendV2, filename);

        const mode = (type << 12) | permission;
        let flags: SendV2Flags = SendV2Flags.None;
        switch (compression) {
            case Compression.Type.Brotli:
                flags |= SendV2Flags.Brotli;
                break;
            case Compression.Type.Lz4:
                flags |= SendV2Flags.Lz4;
                break;
            case Compression.Type.Zstd:
                flags |= SendV2Flags.Zstd;
                break;
        }
        if (dryRun) {
            flags |= SendV2Flags.DryRun;
        }
        await locked.write(
            SendV2Request.serialize({
                id: RequestId.SendV2,
                mode,
                flags,
            }),
        );

        await pipeFileData(locked, file, packetSize, mtime, compression);
    } finally {
        locked.release();
    }
}

export interface SendOptions extends SendV2Options {
    version: 1 | 2;
}

export function send(options: SendOptions) {
    if (options.version === 2) {
        return sendV2(options);
    }

    if (options.dryRun) {
        throw new Error("dryRun is not supported in v1");
    }

    if (
        options.compression !== undefined &&
        options.compression !== Compression.Type.None
    ) {
        throw new Error("compression is not supported in v1");
    }

    return sendV1(options);
}
