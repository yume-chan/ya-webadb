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

export interface StructSyncDeserializationContext extends StructSerializationContext {
    decodeUtf8(buffer: ArrayBuffer): string;

    read(length: number): ArrayBuffer;
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
