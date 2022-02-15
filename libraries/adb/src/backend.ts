import type { Event } from '@yume-chan/event';
import type { ValueOrPromise } from '@yume-chan/struct';
import type { ReadableStream, WritableStream } from "./utils";

export interface AdbBackend {
    readonly serial: string;

    readonly name: string | undefined;

    readonly connected: boolean;

    readonly onDisconnected: Event<void>;

    readonly readable: ReadableStream<ArrayBuffer> | undefined;

    readonly writable: WritableStream<ArrayBuffer> | undefined;

    connect?(): ValueOrPromise<void>;

    dispose(): ValueOrPromise<void>;
}
