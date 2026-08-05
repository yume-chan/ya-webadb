import { PromiseResolver } from "@yume-chan/async";
import type {
    TransformStream,
    WritableStream,
    WritableStreamDefaultController,
} from "@yume-chan/stream-extra";
import { DistributionStream, MaybeConsumable } from "@yume-chan/stream-extra";
import { struct, u32 } from "@yume-chan/struct";

import { NOOP } from "../../../utils/no-op.js";
import { LinuxFileType } from "../android.js";
import { Compression } from "../compression/index.js";
import { RequestId, ResponseId } from "../id/index.js";
import type { SocketPool } from "../socket-pool.js";
import type { Socket } from "../socket.js";
import { Error as AdbSyncError } from "../socket.js";

import { SyncFlag } from "./flag.js";

export const MaxPacketSize = 64 * 1024;

export const OkResponse = struct({ unused: u32 }, { littleEndian: true });

export interface SendSession {
    /**
     * The writable stream to write the file content into.
     */
    writable: WritableStream<MaybeConsumable<Uint8Array>>;
    /**
     * Gets the number of bytes written into {@link writable}.
     */
    bytesWritten: number;
    /**
     * When using Send v2, gets the compression format used (might be `None`).
     *
     * When using Send v1, this will always be `undefined`.
     */
    compression?: Compression.Format | undefined;
    /**
     * When using Send v2, gets the size of the compressed data sent to the device.
     * Might be same as {@link bytesWritten} if no compression was applied.
     */
    bytesCompressed: number;
}

class SendWritableStream extends MaybeConsumable.WritableStream<Uint8Array> {
    #pool: SocketPool;
    #socket: Socket;

    #resolver = new PromiseResolver<void>();
    #controller: WritableStreamDefaultController;

    #bytesWritten = 0;
    get bytesWritten() {
        return this.#bytesWritten;
    }

    constructor(pool: SocketPool, socket: Socket, mtime: number) {
        let controller!: WritableStreamDefaultController;

        super({
            start: (controller_) => {
                controller = controller_;

                // Start reading response immediately,
                // the server can send error response before the whole file is sent.
                socket.readResponse(ResponseId.Ok, OkResponse).then(
                    () => this.#finish(),
                    (e) => this.#finish(e),
                );
            },
            write: async (chunk) => {
                try {
                    this.#bytesWritten += chunk.length;
                    await socket.writeRequest(RequestId.Data, chunk);
                } catch (e) {
                    await this.#finish(e);
                }
            },
            close: async () => {
                try {
                    await socket.writeRequest(RequestId.Done, mtime);
                    await socket.flush();
                } catch (e) {
                    await this.#finish(e);
                    return;
                }
                await this.#resolver.promise;
            },
            abort: async (reason) => {
                // Write anything other than `Data` or `Done`
                // will cause the server to delete the file.
                await socket.writeRequest(ResponseId.Fail, 0);

                // Socket not reusable after aborting, so discard it.
                await this.#finish(reason);
            },
        });

        this.#pool = pool;
        this.#socket = socket;

        this.#controller = controller;
        // Suppress unhandled rejection warning when the promise is not awaited.
        this.#resolver.promise.catch(NOOP);
    }

    #trySetError(reason: unknown) {
        try {
            this.#controller.error(reason);
        } catch {
            // Ignore if controller is already closed or errored
        }
    }

    async #finish(error?: unknown) {
        try {
            await this.#pool.release(
                this.#socket,
                !(error instanceof AdbSyncError),
            );
            if (error) {
                this.#trySetError(error);
                this.#resolver.reject(error);
            } else {
                this.#resolver.resolve();
            }
        } catch (e) {
            // TOOD: use `SuppressedError` when universally supported
            this.#trySetError(e);
            this.#resolver.reject(e);
        }
    }
}

export interface SendV1Options {
    pool: SocketPool;
    path: string;
    type?: LinuxFileType | undefined;
    permission?: number | undefined;
    mtime?: number | undefined;
    packetSize?: number | undefined;
}

export async function sendV1({
    pool,
    path,
    type = LinuxFileType.File,
    permission = 0o666,
    mtime = (Date.now() / 1000) | 0,
    packetSize = MaxPacketSize,
}: SendV1Options): Promise<SendSession> {
    const mode = (type << 12) | permission;
    const request = path + "," + mode;

    const socket = await pool.acquire();
    try {
        await socket.writeRequest(RequestId.Send, request);
    } catch (e) {
        await pool.release(socket, !(e instanceof AdbSyncError));
        throw e;
    }

    const distributeStream = new DistributionStream(packetSize, true);
    const sendStream = new SendWritableStream(pool, socket, mtime);
    void distributeStream.readable.pipeTo(sendStream).catch(NOOP);

    return {
        writable: distributeStream.writable,
        get bytesWritten() {
            return sendStream.bytesWritten;
        },
        get bytesCompressed() {
            return sendStream.bytesWritten;
        },
    };
}

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

export async function sendV2({
    pool,
    path,
    type = LinuxFileType.File,
    permission = 0o666,
    mtime = (Date.now() / 1000) | 0,
    packetSize = MaxPacketSize,
    compression = Compression.Format.None,
    dryRun = false,
}: SendV2Options): Promise<SendSession> {
    let flags: SyncFlag = SyncFlag.None;
    let compressStream: TransformStream<Uint8Array, Uint8Array> | undefined;

    // Validate `compression` before acquiring the socket
    switch (compression) {
        case Compression.Format.Brotli:
            flags |= SyncFlag.Brotli;
            compressStream = Compression.createCompressionStream(
                Compression.Format.Brotli,
            );
            break;
        case Compression.Format.Lz4:
            flags |= SyncFlag.Lz4;
            compressStream = Compression.createCompressionStream(
                Compression.Format.Lz4,
            );
            break;
        case Compression.Format.Zstd:
            flags |= SyncFlag.Zstd;
            compressStream = Compression.createCompressionStream(
                Compression.Format.Zstd,
            );
            break;
    }
    if (dryRun) {
        flags |= SyncFlag.DryRun;
    }

    const socket = await pool.acquire();
    try {
        await socket.writeRequest(RequestId.SendV2, path);
        await socket.write(
            SendV2Request.serialize({
                id: RequestId.SendV2,
                mode: (type << 12) | permission,
                flags,
            }),
        );
    } catch (e) {
        await pool.release(socket, !(e instanceof AdbSyncError));
        throw e;
    }

    const distributeStream = new DistributionStream(packetSize, true);
    const sendStream = new SendWritableStream(pool, socket, mtime);

    if (!compressStream) {
        const pipe = distributeStream.readable.pipeTo(sendStream);

        const writer = distributeStream.writable.getWriter();
        return {
            writable: new MaybeConsumable.WritableStream({
                write(chunk) {
                    return writer.write(chunk);
                },
                async close() {
                    await writer.close();
                    await pipe;
                },
            }),
            get bytesWritten() {
                return sendStream.bytesWritten;
            },
            compression: Compression.Format.None,
            get bytesCompressed() {
                return sendStream.bytesWritten;
            },
        };
    }

    const pipe = compressStream.readable
        .pipeThrough(distributeStream)
        .pipeTo(sendStream);

    const writer = compressStream.writable.getWriter();
    let bytesWritten = 0;
    return {
        writable: new MaybeConsumable.WritableStream({
            write(chunk) {
                bytesWritten += chunk.length;
                return writer.write(chunk);
            },
            async close() {
                await writer.close();
                await pipe;
            },
        }),
        get bytesWritten() {
            return bytesWritten;
        },
        compression,
        get bytesCompressed() {
            return sendStream.bytesWritten;
        },
    };
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
