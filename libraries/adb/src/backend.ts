import type { Event } from '@yume-chan/event';
import type { ValueOrPromise } from '@yume-chan/struct';

export interface AdbBackend {
    readonly serial: string;

    readonly name: string | undefined;

    readonly connected: boolean;

    readonly onDisconnected: Event<void>;

    connect?(): ValueOrPromise<void>;

    read(length: number): ValueOrPromise<ArrayBuffer>;

    write(buffer: ArrayBuffer): ValueOrPromise<void>;

    dispose(): ValueOrPromise<void>;
}
