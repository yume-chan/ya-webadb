import type { MaybePromiseLike } from "@yume-chan/async";

export interface TangoKey {
    privateKey: Uint8Array;
    name: string | undefined;
}

export interface TangoKeyStorage {
    save(
        privateKey: Uint8Array,
        name: string | undefined,
    ): MaybePromiseLike<undefined>;

    load(): Iterable<TangoKey> | AsyncIterable<TangoKey>;
}
