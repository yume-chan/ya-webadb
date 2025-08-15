import type { MaybePromiseLike } from "@yume-chan/async";

export interface TangoDataStorage {
    save(data: Uint8Array): MaybePromiseLike<undefined>;

    load(): Iterable<Uint8Array> | AsyncIterable<Uint8Array>;
}
