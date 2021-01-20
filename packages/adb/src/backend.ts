import { Event } from '@yume-chan/event';
import { ValueOrPromise } from '@yume-chan/struct';

export type AdbKeyIterable = Iterable<ArrayBuffer> | AsyncIterable<ArrayBuffer>;

export interface AdbBackend {
    readonly serial: string;

    readonly name: string | undefined;

    readonly onDisconnected: Event<void>;

    connect?(): ValueOrPromise<void>;

    iterateKeys(): AdbKeyIterable;

    generateKey(): ValueOrPromise<ArrayBuffer>;

    encodeUtf8(input: string): ArrayBuffer;

    decodeUtf8(buffer: ArrayBuffer): string;

    write(buffer: ArrayBuffer): ValueOrPromise<void>;

    read(length: number): ValueOrPromise<ArrayBuffer>;

    dispose(): ValueOrPromise<void>;
}
