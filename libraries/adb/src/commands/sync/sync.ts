import { AutoDisposable } from '@yume-chan/event';
import type { Adb } from '../../adb.js';
import { AdbFeatures } from '../../features.js';
import type { AdbSocket } from '../../socket/index.js';
import { AdbBufferedStream, ReadableStream, WrapReadableStream, WrapWritableStream, WritableStream, WritableStreamDefaultWriter } from '../../stream/index.js';
import { AutoResetEvent } from '../../utils/index.js';
import { escapeArg } from "../index.js";
import { adbSyncOpenDir, type AdbSyncEntry } from './list.js';
import { adbSyncPull } from './pull.js';
import { adbSyncPush } from './push.js';
import { adbSyncLstat, adbSyncStat } from './stat.js';

/**
 * A simplified `dirname` function that only handles absolute unix paths.
 * @param path an absolute unix path
 * @returns the directory name of the input path
 */
export function dirname(path: string): string {
    const end = path.lastIndexOf('/');
    if (end === -1) {
        throw new Error(`Invalid path`);
    }
    if (end === 0) {
        return '/';
    }
    return path.substring(0, end);
}

export class AdbSync extends AutoDisposable {
    protected adb: Adb;

    protected stream: AdbBufferedStream;

    protected writer: WritableStreamDefaultWriter<Uint8Array>;

    protected sendLock = this.addDisposable(new AutoResetEvent());

    public get supportsStat(): boolean {
        return this.adb.features!.includes(AdbFeatures.StatV2);
    }

    public get supportsList2(): boolean {
        return this.adb.features!.includes(AdbFeatures.ListV2);
    }

    public get fixedPushMkdir(): boolean {
        return this.adb.features!.includes(AdbFeatures.FixedPushMkdir);
    }

    public get needPushMkdirWorkaround(): boolean {
        // https://android.googlesource.com/platform/packages/modules/adb/+/91768a57b7138166e0a3d11f79cd55909dda7014/client/file_sync_client.cpp#1361
        return this.adb.features!.includes(AdbFeatures.ShellV2) && !this.fixedPushMkdir;
    }

    public constructor(adb: Adb, socket: AdbSocket) {
        super();

        this.adb = adb;
        this.stream = new AdbBufferedStream(socket);
        this.writer = socket.writable.getWriter();
    }

    public async lstat(path: string) {
        await this.sendLock.wait();

        try {
            return adbSyncLstat(this.stream, this.writer, path, this.supportsStat);
        } finally {
            this.sendLock.notify();
        }
    }

    public async stat(path: string) {
        if (!this.supportsStat) {
            throw new Error('Not supported');
        }

        await this.sendLock.wait();

        try {
            return adbSyncStat(this.stream, this.writer, path);
        } finally {
            this.sendLock.notify();
        }
    }

    public async isDirectory(path: string): Promise<boolean> {
        try {
            await this.lstat(path + '/');
            return true;
        } catch (e) {
            return false;
        }
    }

    public async *opendir(
        path: string
    ): AsyncGenerator<AdbSyncEntry, void, void> {
        await this.sendLock.wait();

        try {
            yield* adbSyncOpenDir(this.stream, this.writer, path, this.supportsList2);
        } finally {
            this.sendLock.notify();
        }
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
        return new WrapReadableStream({
            start: async () => {
                await this.sendLock.wait();
                return adbSyncPull(this.stream, this.writer, filename);
            },
            close: async () => {
                this.sendLock.notify();
            },
        });
    }

    /**
     * Write (or overwrite) a file on device.
     *
     * @param filename The full path of the file on device to write.
     * @param mode The unix permissions of the file.
     * @param mtime The modified time of the file.
     * @returns A `WritableStream` that writes to the file.
     */
    public write(
        filename: string,
        mode?: number,
        mtime?: number,
    ): WritableStream<Uint8Array> {
        return new WrapWritableStream({
            start: async () => {
                await this.sendLock.wait();

                if (this.needPushMkdirWorkaround) {
                    // It may fail if the path is already existed.
                    // Ignore the result.
                    // TODO: sync: test this
                    await this.adb.subprocess.spawnAndWait([
                        'mkdir',
                        '-p',
                        escapeArg(dirname(filename)),
                    ]);
                }

                return adbSyncPush(
                    this.stream,
                    this.writer,
                    filename,
                    mode,
                    mtime,
                );
            },
            close: async () => {
                this.sendLock.notify();
            }
        });
    }

    public override async dispose() {
        super.dispose();
        await this.stream.close();
        await this.writer.close();
    }
}
