import type { MaybePromiseLike } from "@yume-chan/async";

export interface TangoPrfCreationResult {
    /**
     * The generated PRF output
     */
    output: BufferSource;

    /**
     * ID of the created secret key
     */
    id: Uint8Array<ArrayBuffer>;
}

export interface TangoPrfSource {
    /**
     * Creates a new secret key and generate PRF output using the key and input data.
     *
     * @param input The input data
     */
    create(
        input: Uint8Array<ArrayBuffer>,
    ): MaybePromiseLike<TangoPrfCreationResult>;

    /**
     * Generates PRF output using the secret key and input data.
     *
     * @param id ID of the secret key
     * @param input The input data
     */
    get(
        id: BufferSource,
        input: Uint8Array<ArrayBuffer>,
    ): MaybePromiseLike<BufferSource>;
}
