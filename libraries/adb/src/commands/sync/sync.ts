import { AutoDisposable } from '@yume-chan/event';
import { Adb } from '../../adb';
import { AdbFeatures } from '../../features';
import { AdbSocket } from '../../socket';
import { AdbBufferedStream } from '../../stream';
import { AutoResetEvent, ReadableStream, TransformStream, WritableStream, WritableStreamDefaultWriter } from '../../utils';
import { AdbSyncEntryResponse, adbSyncOpenDir } from './list';
import { adbSyncPull } from './pull';
import { adbSyncPush } from './push';
import { adbSyncLstat, adbSyncStat } from './stat';

export class AdbSync extends AutoDisposable {
    protected adb: Adb;

    protected stream: AdbBufferedStream;

    protected writer: WritableStreamDefaultWriter<ArrayBuffer>;

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
     * @returns
     * A promise that resolves to a `ReadableStream`.
     *
     * If the promise doesn't resolve immediately, it means the sync object is busy processing another command.
     */
    public async read(filename: string): Promise<ReadableStream<ArrayBuffer>> {
        await this.sendLock.wait();

        const readable = adbSyncPull(this.stream, this.writer, filename);

        const lockStream = new TransformStream<ArrayBuffer, ArrayBuffer>();
        readable
            .pipeTo(lockStream.writable)
            .then(() => {
                this.sendLock.notify();
            });

        return lockStream.readable;
    }

    /**
     * Write (or overwrite) a file on device.
     *
     * @param filename The full path of the file on device to write.
     * @param mode The unix permissions of the file.
     * @param mtime The modified time of the file.
     * @returns
     * A promise that resolves to a `WritableStream`.
     *
     * If the promise doesn't resolve immediately, it means the sync object is busy processing another command.
     */
    public async write(
        filename: string,
        mode?: number,
        mtime?: number,
    ): Promise<WritableStream<ArrayBuffer>> {
        await this.sendLock.wait();

        const writable = adbSyncPush(
            this.stream,
            this.writer,
            filename,
            mode,
            mtime,
        );

        const lockStream = new TransformStream<ArrayBuffer, ArrayBuffer>();
        // `lockStream`'s `flush` will be invoked before `writable` fully closes,
        // but `lockStream.readable.pipeTo` will wait for `writable` to close.
        lockStream.readable
            .pipeTo(writable)
            .then(() => {
                this.sendLock.notify();
            });

        return lockStream.writable;
    }

    public override async dispose() {
        super.dispose();
        this.stream.close();
        await this.writer.close();
    }
}
