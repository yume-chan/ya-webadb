import type { ValueOrPromise } from '../utils';

/**
 * Context with enough methods to serialize a struct
 */
export interface StructSerializationContext {
    /**
     * Encode the specified string into an ArrayBuffer using UTF-8 encoding
     */
    encodeUtf8(input: string): ArrayBuffer;
}

/**
 * Context with enough methods to deserialize a struct
 */
export interface StructDeserializationContext extends StructSerializationContext {
    /**
     * Decode the specified `ArrayBuffer` using UTF-8 encoding
     */
    decodeUtf8(buffer: ArrayBuffer): string;

    /**
     * Read data from the underlying data source.
     *
     * Context should return exactly `length` bytes or data. If that's not possible
     * (due to end of file or other error condition), it should throw an error.
     */
    read(length: number): ValueOrPromise<ArrayBuffer>;
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
