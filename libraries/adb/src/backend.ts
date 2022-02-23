import type { ValueOrPromise } from '@yume-chan/struct';
import type { ReadableWritablePair } from "./stream";

export interface AdbBackend {
    readonly serial: string;

    readonly name: string | undefined;

    connect(): ValueOrPromise<ReadableWritablePair<Uint8Array, Uint8Array>>;
}
