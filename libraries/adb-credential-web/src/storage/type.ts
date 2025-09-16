import type { MaybeError } from "@yume-chan/adb";
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

    load():
        | Iterable<MaybeError<TangoKey>>
        | AsyncIterable<MaybeError<TangoKey>>;
}
