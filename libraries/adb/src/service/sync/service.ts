import type {
    AbortSignal,
    MaybeConsumable,
    ReadableStream,
} from "@yume-chan/stream-extra";

import type { Adb } from "../../adb.js";
import { AdbFeature } from "../../features.js";
import { escapeArg } from "../subprocess/index.js";

import type { LinuxFileType } from "./android.js";
import { Compression } from "./compression/index.js";
import { OpenDir, Receive, Send, Stat } from "./request/index.js";
import { SocketPool } from "./socket-pool.js";
import type { Socket } from "./socket.js";
import { Error as AdbSyncError } from "./socket.js";

export interface ServiceOptions {
    /**
     * Maximum number of sockets to keep in the pool for reuse.
     * Extra sockets beyond this limit will be closed when released.
     * @default 4
     */
    maxPoolSize?: number | undefined;

    /**
     * Time in milliseconds to keep idle sockets in the pool before closing them.
     * Set to 0 to disable idle timeout (sockets will remain until pool is disposed).
     * @default 60000 (1 minute)
     */
    idleTimeout?: number | undefined;

    /**
     * Abort signal to dispose the socket pool when aborted.
     */
    signal?: AbortSignal | undefined;
}

/**
 * A simplified `dirname` function that only handles absolute unix paths.
 * @param path an absolute unix path
 * @returns the directory name of the input path
 */
export function dirname(path: string): string {
    const end = path.lastIndexOf("/");
    if (end === -1) {
        throw new Error(`Invalid absolute unix path: ${path}`);
    }
    if (end === 0) {
        return "/";
    }
    return path.substring(0, end);
}

export interface WriteOptions {
    filename: string;
    file: ReadableStream<MaybeConsumable<Uint8Array>>;
    type?: LinuxFileType | undefined;
    permission?: number | undefined;
    mtime?: number | undefined;
    /**
     * The format to compress the file stream for sending.
     *
     * If the device doesn't support compressed sending, it will be ignored.
     *
     * If the device or current runtime doesn't support the specified format,
     * an Error will be thrown.
     * {@link Compression.canUseFormat} can be used to check if
     * the device and current runtime both supports the format.
     */
    compression?: Compression.Format | undefined;
    dryRun?: boolean | undefined;
}

export class Service {
    protected _adb: Adb;
    readonly #socketPool: SocketPool;

    readonly #supportsStat2: boolean;
    readonly #supportsLs2: boolean;
    readonly #fixedPushMkdir: boolean;
    readonly #supportsSendReceive2: boolean;
    readonly #needPushMkdirWorkaround: boolean;

    get supportsStat2(): boolean {
        return this.#supportsStat2;
    }

    get supportsLs2(): boolean {
        return this.#supportsLs2;
    }

    get fixedPushMkdir(): boolean {
        return this.#fixedPushMkdir;
    }

    get supportsSendReceive2(): boolean {
        return this.#supportsSendReceive2;
    }

    get needPushMkdirWorkaround(): boolean {
        return this.#needPushMkdirWorkaround;
    }

    constructor(adb: Adb, options?: ServiceOptions) {
        this._adb = adb;
        this.#socketPool = new SocketPool(
            adb,
            options?.maxPoolSize,
            options?.idleTimeout,
        );

        // Dispose the socket pool when the abort signal is triggered
        options?.signal?.addEventListener("abort", () => {
            void this.#socketPool.dispose();
        });

        this.#supportsStat2 = adb.canUseFeature(AdbFeature.Stat2);
        this.#supportsLs2 = adb.canUseFeature(AdbFeature.Ls2);
        this.#fixedPushMkdir = adb.canUseFeature(AdbFeature.FixedPushMkdir);
        this.#supportsSendReceive2 = adb.canUseFeature(AdbFeature.SendReceive2);
        // https://android.googlesource.com/platform/packages/modules/adb/+/91768a57b7138166e0a3d11f79cd55909dda7014/client/file_sync_client.cpp#1361
        this.#needPushMkdirWorkaround =
            this._adb.canUseFeature(AdbFeature.Shell2) && !this.fixedPushMkdir;
    }

    /**
     * Acquires a socket from the pool for direct use.
     *
     * The socket must be returned to the pool using {@link releaseSocket} after use.
     *
     * @returns A socket from the pool
     */
    async acquireSocket() {
        return await this.#socketPool.acquire();
    }

    /**
     * Returns a socket to the pool after use.
     *
     * @param socket The socket to return to the pool
     * @param discard Whether to discard the socket instead of returning it to the pool
     */
    async releaseSocket(socket: Socket, discard = false) {
        await this.#socketPool.release(socket, discard);
    }

    /**
     * Gets information of a file or folder.
     *
     * If `path` points to a symbolic link, the returned information is about the link itself (with `type` being `LinuxFileType.Link`).
     */
    lstat(path: string): Promise<Stat.Stat> {
        return Stat.lstat(this.#socketPool, path, {
            version: this.#supportsStat2 ? 2 : 1,
        });
    }

    /**
     * Gets the information of a file or folder.
     *
     * If `path` points to a symbolic link, it will be resolved and the returned information is about the target (with `type` being `LinuxFileType.File` or `LinuxFileType.Directory`).
     */
    stat(path: string) {
        if (!this.#supportsStat2) {
            throw new Error("Not supported");
        }

        return Stat.stat(this.#socketPool, path);
    }

    /**
     * Checks if `path` is a directory, or a symbolic link to a directory.
     *
     * This uses `lstat` internally, thus works on all Android versions.
     */
    async isDirectory(path: string): Promise<boolean> {
        try {
            await this.lstat(path + "/");
            return true;
        } catch (e) {
            if (e instanceof AdbSyncError) {
                return false;
            } else {
                throw e;
            }
        }
    }

    opendir(path: string): AsyncGenerator<OpenDir.Entry, void, void> {
        return OpenDir.opendir(this.#socketPool, path, {
            version: this.supportsLs2 ? 2 : 1,
        });
    }

    async readdir(path: string) {
        // TODO: Convert to `Array.fromAsync`
        const results: OpenDir.Entry[] = [];
        for await (const entry of this.opendir(path)) {
            results.push(entry);
        }
        return results;
    }

    /**
     * Reads the content of a file on device.
     *
     * @param filename The full path of the file on device to read.
     * @returns A `ReadableStream` that contains the file content.
     */
    read(filename: string): ReadableStream<Uint8Array> {
        return Receive.stream(this.#socketPool, filename);
    }

    /**
     * Writes a file on device. If the file name already exists, it will be overwritten.
     *
     * @param options The content and options of the file to write.
     */
    async write(options: WriteOptions): Promise<void> {
        if (this.needPushMkdirWorkaround) {
            // It may fail if `filename` already exists.
            // Ignore the result.
            // TODO: sync: test push mkdir workaround (need an Android 8 device)
            await this._adb.subprocess.noneProtocol
                .spawn(["mkdir", "-p", escapeArg(dirname(options.filename))])
                .wait();
        }

        if (this.supportsSendReceive2) {
            if (options.compression === undefined) {
                options.compression = Compression.chooseFormat(
                    this._adb,
                    Compression.Mode.Compress,
                );
            } else if (
                !Compression.canUseFormat(
                    this._adb,
                    options.compression,
                    Compression.Mode.Compress,
                )
            ) {
                throw new Error(
                    `Compression type ${options.compression} is not supported`,
                );
            }
        }

        await Send.send({
            version: this.supportsSendReceive2 ? 2 : 1,
            pool: this.#socketPool,
            ...options,
        });
    }
}
