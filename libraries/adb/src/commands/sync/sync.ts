import { AutoDisposable } from '@yume-chan/event';
import { Adb } from '../../adb';
import { AdbFeatures } from '../../features';
import { AdbSocket } from '../../socket';
import { AdbBufferedStream } from '../../stream';
import { AutoResetEvent, QueuingStrategy, ReadableStream, TransformStream, WritableStream, WritableStreamDefaultWriter } from '../../utils';
import { AdbSyncEntryResponse, adbSyncOpenDir } from './list';
import { adbSyncPull } from './pull';
import { adbSyncPush } from './push';
import { adbSyncLstat, adbSyncStat } from './stat';

class LockTransformStream<T> extends TransformStream<T, T>{
    constructor(
        lock: AutoResetEvent,
        writableStrategy?: QueuingStrategy<T>,
        readableStrategy?: QueuingStrategy<T>
    ) {
        super(
            {
                start() {
                    return lock.wait();
                },
                flush() {
                    lock.notify();
                },
            },
            writableStrategy,
            readableStrategy
        );
    }
}

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

    public read(filename: string, highWaterMark = 16 * 1024): ReadableStream<ArrayBuffer> {
        const readable = adbSyncPull(this.stream, this.writer, filename, highWaterMark);
        return readable.pipeThrough(new LockTransformStream(
            this.sendLock,
            { highWaterMark, size(chunk) { return chunk.byteLength; } },
            { highWaterMark, size(chunk) { return chunk.byteLength; } }
        ));
    }

    public write(
        filename: string,
        mode?: number,
        mtime?: number,
        onProgress?: (uploaded: number) => void,
        highWaterMark = 16 * 1024,
    ): WritableStream<ArrayBuffer> {
        const lockStream = new LockTransformStream<ArrayBuffer>(
            this.sendLock,
            { highWaterMark, size(chunk) { return chunk.byteLength; } },
            { highWaterMark, size(chunk) { return chunk.byteLength; } }
        );

        const writable = adbSyncPush(
            this.stream,
            this.writer,
            filename,
            mode,
            mtime,
            undefined,
            onProgress
        );
        lockStream.readable.pipeTo(writable);

        return lockStream.writable;
    }

    public override dispose() {
        super.dispose();
        this.stream.close();
        this.writer.close();
    }
}
