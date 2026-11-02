import type { BufferLengthConverter } from "./buffer.js";
import { buffer } from "./buffer.js";
import type { Field } from "./field/index.js";
import { decodeUtf8, encodeUtf8 } from "./utils.js";

export interface String {
    (length: number): Field<string, never, never> & {
        as: <T>(infer: T) => Field<T, never, never>;
    };

    <K extends string>(
        lengthField: K,
    ): Field<string, K, Record<K, number>> & {
        as: <T>(infer: T) => Field<T, K, Record<K, number>>;
    };

    <const K extends string, KT>(
        length: BufferLengthConverter<K, KT>,
    ): Field<string, K, Record<K, KT>> & {
        as: <T>(infer: T) => Field<T, K, Record<K, KT>>;
    };

    <KOmitInit extends string, KS>(
        length: Field<number, KOmitInit, KS>,
    ): Field<string, KOmitInit, KS>;
}

// Prettier will move the annotation and make it invalid
// prettier-ignore
export const string: String = (/* #__NO_SIDE_EFFECTS__ */ (
    lengthOrField: string | number | BufferLengthConverter<string, unknown>,
): Field<string, string, Record<string, unknown>> & {
    as: <T>(infer: T) => Field<T, string, Record<string, unknown>>;
} => {
    const field = buffer(lengthOrField as never, {
        convert: decodeUtf8,
        back: encodeUtf8,
    });
    (field as never as { as: unknown }).as = () => field;
    return field as never;
}) as never;
