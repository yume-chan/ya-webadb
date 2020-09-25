export interface StructSerializationContext {
    encodeUtf8(input: string): ArrayBuffer;
}

export interface StructDeserializationContext extends StructSerializationContext {
    decodeUtf8(buffer: ArrayBuffer): string;

    read(length: number): ArrayBuffer | Promise<ArrayBuffer>;
}

export interface StructOptions {
    littleEndian: boolean;
}

export const StructDefaultOptions: Readonly<StructOptions> = {
    littleEndian: false,
};
