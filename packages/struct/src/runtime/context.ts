import type { StructFieldRuntimeTypeRegistry } from './registry';
import { GlobalStructFieldRuntimeTypeRegistry } from './registry';

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
     * Read exactly `length` bytes of data from underlying storage.
     *
     * Errors can be thrown to indicates end of file or other errors.
     */
    read(length: number): ArrayBuffer | Promise<ArrayBuffer>;
}

export interface StructOptions {
    /**
     * Whether multi-byte fields in this struct are in little endian
     *
     * Default to `false`
     */
    littleEndian: boolean;

    fieldRuntimeTypeRegistry: StructFieldRuntimeTypeRegistry;
}

export const StructDefaultOptions: Readonly<StructOptions> = {
    littleEndian: false,
    fieldRuntimeTypeRegistry: GlobalStructFieldRuntimeTypeRegistry,
};
