import { AutoDisposable } from '@yume-chan/event';
import type { Adb } from '../../adb.js';
import { AdbFeatures } from '../../features.js';
import type { AdbSocket } from '../../socket/index.js';
import { AdbBufferedStream, ReadableStream, WrapReadableStream, WrapWritableStream, WritableStream, WritableStreamDefaultWriter } from '../../stream/index.js';
import { AutoResetEvent } from '../../utils/index.js';
import { AdbSyncEntryResponse, adbSyncOpenDir } from './list.js';
import { adbSyncPull } from './pull.js';
import { adbSyncPush } from './push.js';
import { adbSyncLstat, adbSyncStat } from './stat.js';

export class AdbSync extends AutoDisposable {
    protected adb: Adb;

    protected stream: AdbBufferedStream;

    protected writer: WritableStreamDefaultWriter<Uint8Array>;

    protected sendLock = this.addDisposable(new AutoResetEvent());

    public get supportsStat(): boolean {
        return this.adb.features!.includes(AdbFeatures.StatV2);
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
    ): AsyncGenerator<AdbSyncEntryResponse, void, void> {
        await this.sendLock.wait();

        try {
            yield* adbSyncOpenDir(this.stream, this.writer, path);
        } finally {
            this.sendLock.notify();
        }
    }

    public async readdir(path: string) {
        const results: AdbSyncEntryResponse[] = [];
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
        return new WrapReadableStream<Uint8Array, ReadableStream<Uint8Array>, undefined>({
            start: async () => {
                await this.sendLock.wait();
                return {
                    readable: adbSyncPull(this.stream, this.writer, filename),
                    state: undefined,
                };
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
                return {
                    writable: adbSyncPush(
                        this.stream,
                        this.writer,
                        filename,
                        mode,
                        mtime,
                    ),
                    state: undefined,
                };
            },
            close: async () => {
                this.sendLock.notify();
            }
        });
    }

    public override async dispose() {
        super.dispose();
        this.stream.close();
        await this.writer.close();
    }
}
