import { Event } from '@yume-chan/event';
import { ValueOrPromise } from '@yume-chan/struct';

export interface AdbBackend {
    readonly serial: string;

    readonly name: string | undefined;

    readonly connected: boolean;

    readonly onDisconnected: Event<void>;

    connect?(): ValueOrPromise<void>;

    encodeUtf8(input: string): ArrayBuffer;

    decodeUtf8(buffer: ArrayBuffer): string;

    write(buffer: ArrayBuffer): ValueOrPromise<void>;

    read(length: number): ValueOrPromise<ArrayBuffer>;

    dispose(): ValueOrPromise<void>;
}
