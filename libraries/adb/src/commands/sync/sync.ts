import { AutoDisposable } from "@yume-chan/event";
import type { ReadableStream } from "@yume-chan/stream-extra";

import type { Adb } from "../../adb.js";
import { AdbFeature } from "../../features.js";
import type { AdbSocket } from "../../socket/index.js";
import { escapeArg } from "../subprocess/index.js";

import type { AdbSyncEntry } from "./list.js";
import { adbSyncOpenDir } from "./list.js";
import { adbSyncPull } from "./pull.js";
import { adbSyncPush } from "./push.js";
import { AdbSyncSocket } from "./socket.js";
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

export class AdbSync extends AutoDisposable {
    protected _adb: Adb;
    protected _socket: AdbSyncSocket;

    public get supportsStat(): boolean {
        return this._adb.supportsFeature(AdbFeature.StatV2);
    }

    public get supportsList2(): boolean {
        return this._adb.supportsFeature(AdbFeature.ListV2);
    }

    public get fixedPushMkdir(): boolean {
        return this._adb.supportsFeature(AdbFeature.FixedPushMkdir);
    }

    public get needPushMkdirWorkaround(): boolean {
        // https://android.googlesource.com/platform/packages/modules/adb/+/91768a57b7138166e0a3d11f79cd55909dda7014/client/file_sync_client.cpp#1361
        return (
            this._adb.supportsFeature(AdbFeature.ShellV2) &&
            !this.fixedPushMkdir
        );
    }

    public constructor(adb: Adb, socket: AdbSocket) {
        super();

        this._adb = adb;
        this._socket = new AdbSyncSocket(socket, adb.maxPayloadSize);
    }

    public async lstat(path: string) {
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
        return adbSyncOpenDir(this._socket, path, this.supportsList2);
    }

    public async readdir(path: string) {
        const results: AdbSyncEntry[] = [];
        for await (const entry of this.opendir(path)) {
            results.push(entry);
        }
        return results;
    }

    /**
     * Read the content of a file on device.
     *
     * @param filename The full path of the file on device to read.
     * @returns A `ReadableStream` that reads from the file.
     */
    public read(filename: string): ReadableStream<Uint8Array> {
        return adbSyncPull(this._socket, filename);
    }

    /**
     * Write (or overwrite) a file on device.
     *
     * @param filename The full path of the file on device to write.
     * @param file The content to write.
     * @param mode The unix permissions of the file.
     * @param mtime The modified time of the file.
     * @returns A `WritableStream` that writes to the file.
     */
    public async write(
        filename: string,
        file: ReadableStream<Uint8Array>,
        mode?: number,
        mtime?: number
    ) {
        if (this.needPushMkdirWorkaround) {
            // It may fail if the path is already existed.
            // Ignore the result.
            // TODO: sync: test push mkdir workaround (need an Android 8 device)
            await this._adb.subprocess.spawnAndWait([
                "mkdir",
                "-p",
                escapeArg(dirname(filename)),
            ]);
        }

        await adbSyncPush(this._socket, filename, file, mode, mtime);
    }

    public override async dispose() {
        super.dispose();
        await this._socket.close();
    }
}
