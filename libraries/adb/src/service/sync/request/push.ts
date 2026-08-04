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

export interface SendResult {
    /**
     * Gets the size of the input file stream, before compression (if any) was applied.
     */
    size: number;
    /**
     * When using Send v2, gets the compression format used (might be `None`).
     *
     * When using Send v1, this will always be `undefined`.
     */
    compression?: Compression.Format | undefined;
    /**
     * When using Send v2, gets the size of the compressed data sent to the device.
     * Might be same as `size` if no compression was used.
     *
     * When using Send v1, this will always be `undefined`.
     */
    compressedSize?: number | undefined;
    /**
     * Gets the timestamp when the send operation started (before sending the first request).
     */
    startTime: number;
    /**
     * Gets the timestamp when the success response was received from the device.
     */
    endTime: number;
}

// eslint-disable-next-line @typescript-eslint/max-params
async function pipeFileData(
    socket: Socket,
    file: ReadableStream<MaybeConsumable<Uint8Array>>,
    packetSize: number,
    mtime: number,
    compression: Compression.Format,
): Promise<Pick<SendResult, "size" | "compressedSize">> {
    let rawBytesRead = 0;
    if (compression !== Compression.Format.None) {
        const stream = Compression.createCompressionStream(compression);
        // A manual `pipeThrough` with `MaybeConsumable` conversion.
        // `pipeThrough` doesn't handle the `Promise` returned by `pipeTo`.
        // https://streams.spec.whatwg.org/#rs-pipe-through
        void file
            .pipeTo(
                new MaybeConsumable.WrapWritableStream(stream.writable, {
                    write: (chunk) => {
                        // Count bytes read before compression
                        rawBytesRead += chunk.length;
                    },
                }),
            )
            .catch(NOOP);
        file = stream.readable;
    }

    const abortController = new AbortController();
    let bytesWritten = 0;

    // Don't `await` this `pipeTo`, instead, call `socket.readResponse` in parallel,
    // to receive early error response from server, before file is fully sent.
    // In success case, `socket.readResponse` will resolve after `pipeTo` is finished,
    // so only `await` that is enough.
    file.pipeThrough(new DistributionStream(packetSize, true))
        .pipeTo(
            new MaybeConsumable.WritableStream({
                write(chunk) {
                    bytesWritten += chunk.length;
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

    if (compression !== Compression.Format.None) {
        return { size: rawBytesRead, compressedSize: bytesWritten };
    } else {
        // `rawBytesRead` is only counted when compression is used
        // so return `size == compressedSize == bytesWritten` here
        return { size: bytesWritten, compressedSize: bytesWritten };
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
}: SendV1Options): Promise<SendResult> {
    return pool.withSocket(async (socket) => {
        const startTime = Date.now();

        const mode = (type << 12) | permission;
        const pathAndMode = `${filename},${mode.toString()}`;
        await socket.writeRequest(RequestId.Send, pathAndMode);
        const { size } = await pipeFileData(
            socket,
            file,
            packetSize,
            mtime,
            Compression.Format.None,
        );

        return {
            size,
            startTime,
            endTime: Date.now(),
        };
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
    /**
     * The format to compress the file stream for sending.
     *
     * If the device or current runtime doesn't support the specified format,
     * an Error will be thrown.
     *
     * If `undefined` is specified, no compression will be used.
     * (this behavior is different from `AdbSync.Service.prototype.write`,
     * which will automatically choose the best format)
     */
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
}: SendV2Options): Promise<SendResult> {
    return pool.withSocket(async (socket) => {
        const startTime = Date.now();

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

        const { size, compressedSize } = await pipeFileData(
            socket,
            file,
            packetSize,
            mtime,
            compression,
        );

        return {
            size,
            compression,
            compressedSize,
            startTime,
            endTime: Date.now(),
        };
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
