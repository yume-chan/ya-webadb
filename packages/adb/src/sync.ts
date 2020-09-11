import { AutoDisposable } from '@yume-chan/event';
import { AdbBackend } from './backend';
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
    Done = 'DONE',
    Data = 'DATA',
    Ok = 'OKAY',
}

export abstract class AdbSyncRequestBase<T extends AdbSyncRequestId = AdbSyncRequestId> {
    public readonly id: T;

    public constructor(id: T) {
        this.id = id;
    }

    public abstract toBuffer(backend: AdbBackend): ArrayBuffer;
}

export type AdbSyncNumberRequestId =
    AdbSyncRequestId.Done;

export class AdbSyncNumberRequest extends AdbSyncRequestBase<AdbSyncNumberRequestId> {
    public readonly value: number;

    public constructor(id: AdbSyncNumberRequestId, value: number) {
        super(id);
        this.value = value;
    }

    public toBuffer(backend: AdbBackend): ArrayBuffer {
        const array = new Uint8Array(8);

        const idBuffer = backend.encodeUtf8(this.id);
        array.set(new Uint8Array(idBuffer));

        const view = new DataView(array.buffer);
        view.setUint32(4, this.value, true);

        return array.buffer;
    }
}

export type AdbSyncStringRequestId =
    AdbSyncRequestId.List |
    AdbSyncRequestId.Send |
    AdbSyncRequestId.Stat |
    AdbSyncRequestId.Receive;

export class AdbSyncStringRequest extends AdbSyncRequestBase<AdbSyncStringRequestId> {
    public value: string;

    public constructor(id: AdbSyncStringRequestId, value: string) {
        super(id);
        this.value = value;
    }

    public toBuffer(backend: AdbBackend) {
        const valueBuffer = backend.encodeUtf8(this.value);
        const array = new Uint8Array(8 + valueBuffer.byteLength);

        const idBuffer = backend.encodeUtf8(this.id);
        array.set(new Uint8Array(idBuffer));

        const view = new DataView(array.buffer);
        view.setUint32(4, valueBuffer.byteLength, true);

        array.set(new Uint8Array(valueBuffer), 8);

        return array.buffer;
    }
}

// https://github.com/python/cpython/blob/4e581d64b8aff3e2eda99b12f080c877bb78dfca/Lib/stat.py#L36
export enum LinuxFileType {
    Directory = 0o04,
    File = 0o10,
    Link = 0o12,
}

export class AdbSyncEntryResponse {
    public static async parse(stream: AdbBufferedStream): Promise<AdbSyncEntryResponse> {
        const buffer = await stream.read(16);
        const view = new DataView(buffer);
        const mode = view.getUint32(0, true);
        const size = view.getUint32(4, true);
        const lastModifiedTime = view.getUint32(8, true);
        const nameLength = view.getUint32(12, true);
        const name = stream.backend.decodeUtf8(await stream.read(nameLength));
        return new AdbSyncEntryResponse(mode, size, lastModifiedTime, name);
    }

    public readonly id = AdbSyncResponseId.Entry;

    public readonly type: LinuxFileType;

    public readonly mode: number;

    public readonly size: number;

    public readonly logicalSize: number;

    public readonly lastModifiedTime: number;

    public readonly name: string;

    public constructor(mode: number, size: number, lastModifiedTime: number, name: string) {
        this.type = mode >> 12 as LinuxFileType;
        this.mode = mode & 0b00001111_11111111;
        this.size = size;
        this.logicalSize = this.type === LinuxFileType.File ? this.size : 0;
        this.lastModifiedTime = lastModifiedTime;
        this.name = name;
    }
}

export class AdbSyncDataResponse {
    public static async parse(stream: AdbBufferedStream): Promise<AdbSyncDataResponse> {
        const buffer = await stream.read(4);
        const view = new DataView(buffer);
        const length = view.getUint32(0, true);
        const data = await stream.read(length);
        return new AdbSyncDataResponse(data);
    }

    public readonly id = AdbSyncResponseId.Data;

    public readonly data: ArrayBuffer;

    public constructor(data: ArrayBuffer) {
        this.data = data;
    }
}

export class AdbSyncDoneResponse {
    public readonly id = AdbSyncResponseId.Done;
}

async function parseResponse(stream: AdbBufferedStream) {
    const id = stream.backend.decodeUtf8(await stream.read(4)) as AdbSyncResponseId;
    switch (id) {
        case AdbSyncResponseId.Entry:
            return AdbSyncEntryResponse.parse(stream);
        case AdbSyncResponseId.Data:
            return AdbSyncDataResponse.parse(stream);
        case AdbSyncResponseId.Done:
            await stream.read(4);
            return new AdbSyncDoneResponse();
        default:
            throw new Error('');
    }
}

export class AdbSync extends AutoDisposable {
    private stream: AdbBufferedStream;

    private sendLock = this.addDisposable(new AutoResetEvent());

    public constructor(stream: AdbStream) {
        super();

        this.stream = new AdbBufferedStream(stream);
    }

    public async *iterate(path: string) {
        await this.sendLock.wait();

        try {
            await this.write(new AdbSyncStringRequest(AdbSyncRequestId.List, path));

            while (true) {
                const response = await parseResponse(this.stream);
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
            await this.write(new AdbSyncStringRequest(AdbSyncRequestId.Receive, path));
            while (true) {
                const response = await parseResponse(this.stream);
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

    private write(request: AdbSyncRequestBase) {
        return this.stream.write(request.toBuffer(this.stream.backend));
    }
}
