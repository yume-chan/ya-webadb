import { AutoDisposable } from '@yume-chan/event';
import { Adb } from '../../adb';
import { AdbFeatures } from '../../features';
import { AdbBufferedStream, AdbStream } from '../../stream';
import { AutoResetEvent } from '../../utils';
import { AdbSyncEntryResponse, adbSyncOpenDir } from './list';
import { adbSyncPull } from './receive';
import { adbSyncPush } from './send';
import { adbSyncLstat, adbSyncStat } from './stat';

export class AdbSync extends AutoDisposable {
    protected adb: Adb;

    protected stream: AdbBufferedStream;

    protected sendLock = this.addDisposable(new AutoResetEvent());

    public get supportStat(): boolean {
        return this.adb.features!.includes(AdbFeatures.StatV2);
    }

    public constructor(adb: Adb, stream: AdbStream) {
        super();

        this.adb = adb;
        this.stream = new AdbBufferedStream(stream);
    }

    public async lstat(path: string) {
        await this.sendLock.wait();

        try {
            return adbSyncLstat(this.stream, path, this.supportStat);
        } finally {
            this.sendLock.notify();
        }
    }

    public async stat(path: string) {
        if (!this.supportStat) {
            throw new Error('Not supported');
        }

        await this.sendLock.wait();

        try {
            return adbSyncStat(this.stream, path);
        } finally {
            this.sendLock.notify();
        }
    }

    public async isDirectory(path: string): Promise<boolean> {
        try {
            await this.stat(path + '/');
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
            yield* adbSyncOpenDir(this.stream, path);
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

    public async *read(path: string): AsyncGenerator<ArrayBuffer, void, void> {
        await this.sendLock.wait();

        try {
            yield* adbSyncPull(this.stream, path);
        } finally {
            this.sendLock.notify();
        }
    }

    public async write(
        path: string,
        file: AsyncIterable<ArrayBuffer> | ArrayLike<number>,
        mode = 0o777,
        mtime = Date.now(),
    ): Promise<void> {
        await this.sendLock.wait();

        try {
            adbSyncPush(this.stream, path, file, mode, mtime);
        } finally {
            this.sendLock.notify();
        }
    }

    public dispose() {
        super.dispose();
        this.stream.close();
    }
}
