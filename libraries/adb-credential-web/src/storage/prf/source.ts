export interface TangoPrfSource {
    create(input: Uint8Array<ArrayBuffer>): Promise<{
        output: BufferSource;
        id: Uint8Array<ArrayBuffer>;
    }>;

    get(
        id: BufferSource,
        input: Uint8Array<ArrayBuffer>,
    ): Promise<BufferSource>;
}
