import { Event } from '@yume-chan/event';

export type AdbKeyIterable = Iterable<ArrayBuffer> | AsyncIterable<ArrayBuffer>;

export interface AdbBackend {
    readonly serial: string;

    readonly name: string | undefined;

    readonly onDisconnected: Event<void>;

    connect?(): void | Promise<void>;

    iterateKeys(): AdbKeyIterable;

    generateKey(): ArrayBuffer | Promise<ArrayBuffer>;

    encodeUtf8(input: string): ArrayBuffer;

    decodeUtf8(buffer: ArrayBuffer): string;

    write(buffer: ArrayBuffer): void | Promise<void>;

    read(length: number): ArrayBuffer | Promise<ArrayBuffer>;

    dispose(): void | Promise<void>;
}
