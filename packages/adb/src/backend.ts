import { Event } from '@yume-chan/event';

export type AdbKeyIterator = Iterator<ArrayBuffer> | AsyncIterator<ArrayBuffer>;

export interface AdbBackend {
    readonly serial: string;

    readonly name: string | undefined;

    readonly onDisconnected: Event<void>;

    connect?(): void | Promise<void>;

    iterateKeys(): AdbKeyIterator;

    generateKey(): ArrayBuffer | Promise<ArrayBuffer>;

    encodeUtf8(input: string): ArrayBuffer;

    decodeUtf8(buffer: ArrayBuffer): string;

    write(buffer: ArrayBuffer): void | Promise<void>;

    read(length: number): ArrayBuffer | Promise<ArrayBuffer>;

    dispose(): void | Promise<void>;
}
