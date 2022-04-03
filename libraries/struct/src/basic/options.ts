export interface StructOptions {
    /**
     * Whether all multi-byte fields in this struct are little-endian encoded.
     *
     * @default false
     */
    littleEndian: boolean;

    // TODO: StructOptions: investigate whether this is necessary
    // I can't think about any other options which need to be struct wide.
    // Even endianness can be set on a per-field basis (because it's not meaningful
    // for some field types like `Uint8Array`, and very rarely, a struct may contain
    // mixed endianness).
    // It's just more common and a little more convenient to have it here.
}

export const StructDefaultOptions: Readonly<StructOptions> = {
    littleEndian: false,
};
