import { AutoDisposable } from "@yume-chan/event";
import type { Consumable, ReadableStream } from "@yume-chan/stream-extra";

import type { Adb, AdbSocket } from "../../adb.js";
import { AdbFeature } from "../../features.js";
import { escapeArg } from "../subprocess/index.js";

import type { AdbSyncEntry } from "./list.js";
import { adbSyncOpenDir } from "./list.js";
import { adbSyncPull } from "./pull.js";
import { adbSyncPush } from "./push.js";
import { AdbSyncSocket } from "./socket.js";
import type { AdbSyncStat, LinuxFileType } from "./stat.js";
import { adbSyncLstat, adbSyncStat } from "./stat.js";

/**
 * A simplified `dirname` function that only handles absolute unix paths.
 * @param path an absolute unix path
 * @returns the directory name of the input path
 */
export function dirname(path: string): string {
    const end = path.lastIndexOf("/");
    if (end === -1) {
        throw new Error(`Invalid path`);
    }
    if (end === 0) {
        return "/";
    }
    return path.substring(0, end);
}

export interface AdbSyncWriteOptions {
    filename: string;
    file: ReadableStream<Consumable<Uint8Array>>;
    type?: LinuxFileType;
    permission?: number;
    mtime?: number;
    dryRun?: boolean;
}

export class AdbSync extends AutoDisposable {
    protected _adb: Adb;
    protected _socket: AdbSyncSocket;

    readonly #supportsStat: boolean;
    readonly #supportsListV2: boolean;
    readonly #fixedPushMkdir: boolean;
    readonly #supportsSendReceiveV2: boolean;
    readonly #needPushMkdirWorkaround: boolean;

    public get supportsStat(): boolean {
        return this.#supportsStat;
    }

    public get supportsListV2(): boolean {
        return this.#supportsListV2;
    }

    public get fixedPushMkdir(): boolean {
        return this.#fixedPushMkdir;
    }

    public get supportsSendReceiveV2(): boolean {
        return this.#supportsSendReceiveV2;
    }

    public get needPushMkdirWorkaround(): boolean {
        return this.#needPushMkdirWorkaround;
    }

    public constructor(adb: Adb, socket: AdbSocket) {
        super();

        this._adb = adb;
        this._socket = new AdbSyncSocket(socket, adb.maxPayloadSize);

        this.#supportsStat = adb.supportsFeature(AdbFeature.StatV2);
        this.#supportsListV2 = adb.supportsFeature(AdbFeature.ListV2);
        this.#fixedPushMkdir = adb.supportsFeature(AdbFeature.FixedPushMkdir);
        this.#supportsSendReceiveV2 = adb.supportsFeature(
            AdbFeature.SendReceiveV2
        );
        // https://android.googlesource.com/platform/packages/modules/adb/+/91768a57b7138166e0a3d11f79cd55909dda7014/client/file_sync_client.cpp#1361
        this.#needPushMkdirWorkaround =
            this._adb.supportsFeature(AdbFeature.ShellV2) &&
            !this.fixedPushMkdir;
    }

    public async lstat(path: string): Promise<AdbSyncStat> {
        return await adbSyncLstat(this._socket, path, this.supportsStat);
    }

    public async stat(path: string) {
        if (!this.supportsStat) {
            throw new Error("Not supported");
        }

        return await adbSyncStat(this._socket, path);
    }

    public async isDirectory(path: string): Promise<boolean> {
        try {
            await this.lstat(path + "/");
            return true;
        } catch (e) {
            return false;
        }
    }

    public opendir(path: string): AsyncGenerator<AdbSyncEntry, void, void> {
        return adbSyncOpenDir(this._socket, path, this.supportsListV2);
    }

    public async readdir(path: string) {
        const results: AdbSyncEntry[] = [];
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
    public read(filename: string): ReadableStream<Uint8Array> {
        return adbSyncPull(this._socket, filename);
    }

    /**
     * Writes a file on device. If the file name already exists, it will be overwritten.
     *
     * @param options The content and options of the file to write.
     */
    public async write(options: AdbSyncWriteOptions): Promise<void> {
        if (this.needPushMkdirWorkaround) {
            // It may fail if the path is already existed.
            // Ignore the result.
            // TODO: sync: test push mkdir workaround (need an Android 8 device)
            await this._adb.subprocess.spawnAndWait([
                "mkdir",
                "-p",
                escapeArg(dirname(options.filename)),
            ]);
        }

        await adbSyncPush({
            v2: this.supportsSendReceiveV2,
            socket: this._socket,
            ...options,
        });
    }

    public override async dispose() {
        super.dispose();
        await this._socket.close();
    }
}
