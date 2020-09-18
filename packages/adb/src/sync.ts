import { AutoDisposable } from '@yume-chan/event';
import { AdbBufferedStream } from './buffered-stream';
import { AdbStream } from './stream';
import { AutoResetEvent, Struct, StructInitType, StructReader } from './utils';

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
    new Struct(true)
        .fixedLengthString('id', 4, undefined as any as AdbSyncStringRequestId)
        .lengthPrefixedString('value', 'int32');

// https://github.com/python/cpython/blob/4e581d64b8aff3e2eda99b12f080c877bb78dfca/Lib/stat.py#L36
export enum LinuxFileType {
    Directory = 0o04,
    File = 0o10,
    Link = 0o12,
}

const AdbSyncStatResponseStruct =
    new Struct(true)
        .int32('mode')
        .int32('size')
        .int32('lastModifiedTime')

export class AdbSyncStatResponse {
    public static readonly size = AdbSyncStatResponseStruct.size;

    public static async parse(reader: StructReader): Promise<AdbSyncStatResponse> {
        const struct = await AdbSyncStatResponseStruct.parse(reader);
        if (struct.mode === 0 && struct.size === 0 && struct.lastModifiedTime === 0) {
            throw new Error('lstat failed');
        }
        return new AdbSyncStatResponse(struct.mode, struct.size, struct.lastModifiedTime);
    }

    public readonly id = AdbSyncResponseId.Stat;

    public readonly type: LinuxFileType;

    public readonly mode: number;

    public readonly size: number;

    public readonly lastModifiedTime: number;

    public constructor(mode: number, size: number, lastModifiedTime: number) {
        this.type = mode >> 12 as LinuxFileType;
        this.mode = mode & 0b00001111_11111111;
        this.size = size;
        this.lastModifiedTime = lastModifiedTime;
    }
}

const AdbSyncEntryResponseStruct =
    AdbSyncStatResponseStruct
        .lengthPrefixedString('name', 'int32');

export class AdbSyncEntryResponse {
    public static readonly size = AdbSyncEntryResponseStruct.size;

    public static async parse(reader: StructReader): Promise<AdbSyncEntryResponse> {
        const struct = await AdbSyncEntryResponseStruct.parse(reader);
        return new AdbSyncEntryResponse(struct.mode, struct.size, struct.lastModifiedTime, struct.name);
    }

    public readonly id = AdbSyncResponseId.Entry;

    public readonly type: LinuxFileType;

    public readonly mode: number;

    public readonly size: number;

    public readonly lastModifiedTime: number;

    public readonly name: string;

    public constructor(mode: number, size: number, lastModifiedTime: number, name: string) {
        this.type = mode >> 12 as LinuxFileType;
        this.mode = mode & 0b00001111_11111111;
        this.size = size;
        this.lastModifiedTime = lastModifiedTime;
        this.name = name;
    }
}

const AdbSyncDataResponse =
    new Struct(true)
        .lengthPrefixedBuffer('data', 'int32')
        .extra({ id: AdbSyncResponseId.Data } as const);

export class AdbSyncDoneResponse {
    public static readonly instance = new AdbSyncDoneResponse();

    public readonly id = AdbSyncResponseId.Done;
}

const AdbSyncFailResponseStruct =
    new Struct(true)
        .lengthPrefixedString('message', 'int32');

class AdbSyncFailResponse {
    public static async parse(reader: StructReader): Promise<never> {
        const struct = await AdbSyncFailResponseStruct.parse(reader);
        throw new Error(struct.message);
    }
}

async function parseResponse(stream: AdbBufferedStream, size: number) {
    // DONE responses' size are always same as the request's normal response.
    // For example DONE responses for LIST requests are 16 bytes (same as DENT responses),
    // but DONE responses for STAT requests are 12 bytes (same as STAT responses)
    // So we need to know responses' size in advance.
    const id = stream.backend.decodeUtf8(await stream.read(4)) as AdbSyncResponseId;
    const structReader = {
        read: stream.read.bind(stream),
        decodeUtf8: stream.backend.decodeUtf8.bind(stream.backend),
    };
    switch (id) {
        case AdbSyncResponseId.Entry:
            return AdbSyncEntryResponse.parse(structReader);
        case AdbSyncResponseId.Stat:
            return AdbSyncStatResponse.parse(structReader);
        case AdbSyncResponseId.Data:
            return AdbSyncDataResponse.parse(structReader);
        case AdbSyncResponseId.Done:
            await stream.read(size);
            return AdbSyncDoneResponse.instance;
        case AdbSyncResponseId.Fail:
            return AdbSyncFailResponse.parse(structReader);
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
            const response = await parseResponse(this.stream, AdbSyncStatResponse.size);
            if (response.id !== AdbSyncResponseId.Stat) {
                throw new Error('Unexpected response id');
            }
            return response;
        } finally {
            this.sendLock.notify();
        }
    }

    public async *iterate(path: string) {
        await this.sendLock.wait();

        try {
            await this.write(AdbSyncStringRequest, { id: AdbSyncRequestId.List, value: path });

            while (true) {
                const response = await parseResponse(this.stream, AdbSyncEntryResponse.size);
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

    public async list(path: string) {
        const results: AdbSyncEntryResponse[] = [];
        for await (const entry of this.iterate(path)) {
            results.push(entry);
        }
        return results;
    }

    public async *receive(path: string): AsyncGenerator<ArrayBuffer, void, void> {
        await this.sendLock.wait();

        try {
            await this.write(AdbSyncStringRequest, { id: AdbSyncRequestId.Receive, value: path });
            while (true) {
                const response = await parseResponse(this.stream, AdbSyncDataResponse.size);
                switch (response.id) {
                    case AdbSyncResponseId.Data:
                        yield response.data;
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

    private write<T extends Struct<unknown, unknown>>(type: T, value: StructInitType<T>) {
        return this.stream.write(type.toBuffer(value, this.stream.backend));
    }
}
