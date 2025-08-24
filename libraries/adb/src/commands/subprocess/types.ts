import type { MaybeConsumable, ReadableStream } from "@yume-chan/stream-extra";

import type { LazyPromise } from "./utils.js";

export namespace AdbSubprocessSpawner {
    export interface WaitToString<T> {
        toString(): Promise<T>;
    }

    export interface WaitOptions {
        stdin?: ReadableStream<MaybeConsumable<Uint8Array>> | undefined;
    }

    export interface Wait<TBuffer, TString> {
        wait(
            options?: WaitOptions,
        ): LazyPromise<TBuffer, WaitToString<TString>>;
    }
}
