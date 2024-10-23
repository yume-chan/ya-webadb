export * as NumberFieldVariant from "./number-namespace.js";

export interface NumberFieldVariant {
    signed: boolean;
    size: number;
    deserialize(array: Uint8Array, littleEndian: boolean): number;
    serialize(
        array: Uint8Array,
        offset: number,
        value: number,
        littleEndian: boolean,
    ): void;
}
