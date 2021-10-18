import { AutoDisposable } from '@yume-chan/event';
import { Adb } from '../../adb';
import { AdbFeatures } from '../../features';
import { AdbSocket } from '../../socket';
import { AdbBufferedStream } from '../../stream';
import { AutoResetEvent } from '../../utils';
import { AdbSyncEntryResponse, adbSyncOpenDir } from './list';
import { adbSyncPull } from './pull';
import { adbSyncPush } from './push';
import { adbSyncLstat, adbSyncStat } from './stat';

export class AdbSync extends AutoDisposable {
    protected adb: Adb;

    protected stream: AdbBufferedStream;

    protected sendLock = this.addDisposable(new AutoResetEvent());

    get supportsStat(): boolean {
        return this.adb.features!.includes(AdbFeatures.StatV2);
    }

    constructor(adb: Adb, socket: AdbSocket) {
        super();

        this.adb = adb;
        this.stream = new AdbBufferedStream(socket);
    }

    async lstat(path: string) {
        await this.sendLock.wait();

        try {
            return adbSyncLstat(this.stream, path, this.supportsStat);
        } finally {
            this.sendLock.notify();
        }
    }

    async stat(path: string) {
        if (!this.supportsStat) {
            throw new Error('Not supported');
        }

        await this.sendLock.wait();

        try {
            return adbSyncStat(this.stream, path);
        } finally {
            this.sendLock.notify();
        }
    }

    async isDirectory(path: string): Promise<boolean> {
        try {
            await this.lstat(path + '/');
            return true;
        } catch (e) {
            return false;
        }
    }

    async *opendir(
        path: string
    ): AsyncGenerator<AdbSyncEntryResponse, void, void> {
        await this.sendLock.wait();

        try {
            yield* adbSyncOpenDir(this.stream, path);
        } finally {
            this.sendLock.notify();
        }
    }

    async readdir(path: string) {
        const results: AdbSyncEntryResponse[] = [];
        for await (const entry of this.opendir(path)) {
            results.push(entry);
        }
        return results;
    }

    async *read(filename: string): AsyncGenerator<ArrayBuffer, void, void> {
        await this.sendLock.wait();

        try {
            yield* adbSyncPull(this.stream, filename);
        } finally {
            this.sendLock.notify();
        }
    }

    async write(
        filename: string,
        content: ArrayLike<number> | ArrayBufferLike | AsyncIterable<ArrayBuffer>,
        mode?: number,
        mtime?: number,
        onProgress?: (uploaded: number) => void,
    ): Promise<void> {
        await this.sendLock.wait();

        try {
            await adbSyncPush(this.stream, filename, content, mode, mtime, undefined, onProgress);
        } finally {
            this.sendLock.notify();
        }
    }

    dispose() {
        super.dispose();
        this.stream.close();
    }
}
