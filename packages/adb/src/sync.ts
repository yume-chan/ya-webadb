import { AutoDisposable } from '@yume-chan/event';
import { Struct, StructInitType, StructValueType } from '@yume-chan/struct';
import { AdbBufferedStream } from './buffered-stream';
import { AdbStream } from './stream';
import { AutoResetEvent } from './utils';

export enum AdbSyncRequestId {
    List = 'LIST',
    Send = 'SEND',
    Stat = 'STAT',
    Data = 'DATA',
    Done = 'DONE',
    Receive = 'RECV',
}

export enum AdbSyncResponseId {
    Entry = 'DENT',
    Stat = 'STAT',
    Done = 'DONE',
    Data = 'DATA',
    Ok = 'OKAY',
    Fail = 'FAIL',
}

export type AdbSyncNumberRequestId =
    AdbSyncRequestId.Done;

export type AdbSyncStringRequestId =
    AdbSyncRequestId.List |
    AdbSyncRequestId.Send |
    AdbSyncRequestId.Stat |
    AdbSyncRequestId.Receive;

const AdbSyncStringRequest =
    new Struct({ littleEndian: true })
        .string('id', { length: 4 })
        .uint32('valueLength')
        .string('value', { lengthField: 'valueLength' });

// https://github.com/python/cpython/blob/4e581d64b8aff3e2eda99b12f080c877bb78dfca/Lib/stat.py#L36
export enum LinuxFileType {
    Directory = 0o04,
    File = 0o10,
    Link = 0o12,
}

export const AdbSyncStatResponse =
    new Struct({ littleEndian: true })
        .int32('mode')
        .int32('size')
        .int32('lastModifiedTime')
        .extra({
            id: AdbSyncResponseId.Stat as const,
            get type() { return this.mode >> 12 as LinuxFileType; },
            get permission() { return this.mode & 0b00001111_11111111; },
        })
        .afterParsed((object) => {
            if (object.mode === 0 &&
                object.size === 0 &&
                object.lastModifiedTime === 0
            ) {
                throw new Error('lstat failed');
            }
        });

export const AdbSyncEntryResponse =
    AdbSyncStatResponse
        .afterParsed()
        .uint32('nameLength')
        .string('name', { lengthField: 'nameLength' })
        .extra({ id: AdbSyncResponseId.Entry as const });

export type AdbSyncEntryResponse = StructValueType<typeof AdbSyncEntryResponse>;

export const AdbSyncDataResponse =
    new Struct({ littleEndian: true })
        .uint32('dataLength')
        .arrayBuffer('data', { lengthField: 'dataLength' })
        .extra({ id: AdbSyncResponseId.Data } as const);

export class AdbSyncDoneResponse {
    public static readonly instance = new AdbSyncDoneResponse();

    public readonly id = AdbSyncResponseId.Done;
}

export const AdbSyncFailResponse =
    new Struct({ littleEndian: true })
        .uint32('messageLength')
        .string('message', { lengthField: 'messageLength' })
        .afterParsed(object => {
            throw new Error(object.message);
        });

async function readResponse(stream: AdbBufferedStream, size: number) {
    // DONE responses' size are always same as the request's normal response.
    // For example DONE responses for LIST requests are 16 bytes (same as DENT responses),
    // but DONE responses for STAT requests are 12 bytes (same as STAT responses)
    // So we need to know responses' size in advance.
    const id = stream.backend.decodeUtf8(await stream.read(4)) as AdbSyncResponseId;
    const structReader = {
        read: stream.read.bind(stream),
        decodeUtf8: stream.backend.decodeUtf8.bind(stream.backend),
        encodeUtf8: stream.backend.encodeUtf8.bind(stream.backend),
    };
    switch (id) {
        case AdbSyncResponseId.Entry:
            return AdbSyncEntryResponse.deserialize(structReader);
        case AdbSyncResponseId.Stat:
            return AdbSyncStatResponse.deserialize(structReader);
        case AdbSyncResponseId.Data:
            return AdbSyncDataResponse.deserialize(structReader);
        case AdbSyncResponseId.Done:
            await stream.read(size);
            return AdbSyncDoneResponse.instance;
        case AdbSyncResponseId.Fail:
            return AdbSyncFailResponse.deserialize(structReader);
        default:
            throw new Error('Unexpected response id');
    }
}

export class AdbSync extends AutoDisposable {
    private stream: AdbBufferedStream;

    private sendLock = this.addDisposable(new AutoResetEvent());

    public constructor(stream: AdbStream) {
        super();

        this.stream = new AdbBufferedStream(stream);
    }

    public async lstat(path: string) {
        await this.sendLock.wait();

        try {
            await this.write(AdbSyncStringRequest, { id: AdbSyncRequestId.Stat, value: path });
            const response = await readResponse(this.stream, AdbSyncStatResponse.size);
            if (response.id !== AdbSyncResponseId.Stat) {
                throw new Error('Unexpected response id');
            }
            return response;
        } finally {
            this.sendLock.notify();
        }
    }

    public async *opendir(path: string) {
        await this.sendLock.wait();

        try {
            await this.write(AdbSyncStringRequest, { id: AdbSyncRequestId.List, value: path });

            while (true) {
                const response = await readResponse(this.stream, AdbSyncEntryResponse.size);
                switch (response.id) {
                    case AdbSyncResponseId.Entry:
                        yield response;
                        break;
                    case AdbSyncResponseId.Done:
                        return;
                    default:
                        throw new Error('Unexpected response id');
                }
            }
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

    public async *receive(path: string): AsyncGenerator<ArrayBuffer, void, void> {
        await this.sendLock.wait();

        try {
            await this.write(AdbSyncStringRequest, { id: AdbSyncRequestId.Receive, value: path });
            while (true) {
                const response = await readResponse(this.stream, AdbSyncDataResponse.size);
                switch (response.id) {
                    case AdbSyncResponseId.Data:
                        yield response.data!;
                        break;
                    case AdbSyncResponseId.Done:
                        return;
                    default:
                        throw new Error('Unexpected response id');
                }
            }
        } finally {
            this.sendLock.notify();
        }
    }

    public dispose() {
        super.dispose();
        this.stream.close();
    }

    private write<T extends Struct<object, object, unknown>>(
        type: T,
        value: StructInitType<T>
    ) {
        return this.stream.write(type.serialize(value, this.stream.backend));
    }
}
