import type { ValueOrPromise } from '@yume-chan/struct';
import type { ReadableWritablePair } from "./utils";

export interface AdbBackend {
    readonly serial: string;

    readonly name: string | undefined;

    connect(): ValueOrPromise<ReadableWritablePair<ArrayBuffer, ArrayBuffer>>;
}
