export interface StructDeserializeStream {
    /**
     * Read data from the underlying data source.
     *
     * Stream must return exactly `length` bytes or data. If that's not possible
     * (due to end of file or other error condition), it must throw an error.
     */
    read(length: number): ArrayBuffer;
}

export interface StructAsyncDeserializeStream {
    /**
     * Read data from the underlying data source.
     *
     * Context must return exactly `length` bytes or data. If that's not possible
     * (due to end of file or other error condition), it must throw an error.
     */
    read(length: number): Promise<ArrayBuffer>;
}

export interface StructOptions {
    /**
     * Whether all multi-byte fields in this struct are little-endian encoded.
     *
     * Default to `false`
     */
    littleEndian: boolean;
}

export const StructDefaultOptions: Readonly<StructOptions> = {
    littleEndian: false,
};
