import type {
    BipedalFieldDeserializer,
    ByobFieldSerializer,
    Field,
} from "./field/index.js";
import { field } from "./field/index.js";

export const EmptyUint8Array = new Uint8Array(0);

function copyMaybeDifferentLength(
    dest: Uint8Array,
    source: Uint8Array,
    index: number,
    length: number,
) {
    if (source.length < length) {
        dest.set(source, index);
        // Clear trailing bytes
        dest.fill(0, index + source.length, index + length);
    } else if (source.length === length) {
        dest.set(source, index);
    } else {
        dest.set(source.subarray(0, length), index);
    }
}

export interface Converter<From, To> {
    convert: (value: From) => To;
    back: (value: To) => From;
}

export interface BufferLengthConverter<K, KT> extends Converter<KT, number> {
    field: K;
}

/**
 * Create a fixed-length `Uint8Array` field.
 *
 * @param length Length of the field
 */
export function buffer(
    length: number,
): Field<Uint8Array, never, never, Uint8Array>;
/**
 * Create a custom-typed field, backed by a fixed-length `Uint8Array`.
 *
 * @param length Length of the field
 * @param converter A value converter to convert between `Uint8Array` and the target type
 */
export function buffer<U>(
    length: number,
    converter: Converter<Uint8Array, U>,
): Field<U, never, never, Uint8Array>;

/**
 * Create a variable-length `Uint8Array` field.
 * The length is determined by another number-typed field.
 *
 * @param lengthField Name of the length field. Must be declared before this field
 */
export function buffer<K extends string>(
    lengthField: K,
): Field<Uint8Array, K, Record<K, number>, Uint8Array>;
/**
 * Create a custom-typed field, backed by a variable-length `Uint8Array`.
 * The length is determined by another number-typed field.
 *
 * @param lengthField Name of the length field. Must be declared before this field
 * @param converter A value converter to convert between `Uint8Array` and the target type
 */
export function buffer<K extends string, U>(
    lengthField: K,
    converter: Converter<Uint8Array, U>,
): Field<U, K, Record<K, number>, Uint8Array>;

/**
 * Create a variable-length `Uint8Array` field.
 * The length is determined by converting another field to `number`.
 *
 * @param length
 * Name of the length field,
 * and a converter to convert between source type and `number`.
 * Must be declared before this field
 */
export function buffer<K extends string, KT>(
    length: BufferLengthConverter<K, KT>,
): Field<Uint8Array, K, Record<K, KT>, Uint8Array>;
/**
 * Create a custom-typed field, backed by a variable-length `Uint8Array`.
 * The length is determined by converting another field to `number`.
 *
 * @param length
 * Name of the length field,
 * and a converter to convert between source type and `number`.
 * Must be declared before this field
 * @param converter
 * A value converter to convert between `Uint8Array` and the target type
 */
export function buffer<K extends string, KT, U>(
    length: BufferLengthConverter<K, KT>,
    converter: Converter<Uint8Array, U>,
): Field<U, K, Record<K, KT>, Uint8Array>;

/**
 * Create a length field, and a variable-length `Uint8Array` field.
 * This is a shortcut when the length field is directly before the data field.
 *
 * @param length The length field declaration
 */
export function buffer<LengthOmitInit extends string, LengthDependencies>(
    length: Field<number, LengthOmitInit, LengthDependencies, number>,
): Field<Uint8Array, LengthOmitInit, LengthDependencies, Uint8Array>;
/**
 * Create a length field, and a custom-typed field, backed by a variable-length `Uint8Array`.
 * This is a shortcut when the length field is directly before the data field.
 *
 * @param length The length field declaration
 * @param converter A value converter to convert between `Uint8Array` and the target type
 */
export function buffer<LengthOmitInit extends string, LengthDependencies, U>(
    length: Field<number, LengthOmitInit, LengthDependencies, number>,
    converter: Converter<Uint8Array, U>,
): Field<U, LengthOmitInit, LengthDependencies, Uint8Array>;

/* #__NO_SIDE_EFFECTS__ */
export function buffer(
    lengthOrField:
        | string
        | number
        | Field<number, string, unknown, number>
        | BufferLengthConverter<string, unknown>,
    converter?: Converter<Uint8Array, unknown>,
): Field<unknown, string, Record<string, unknown>, Uint8Array> {
    // Fixed length
    if (typeof lengthOrField === "number") {
        let serialize: ByobFieldSerializer<Uint8Array>;
        let deserialize: BipedalFieldDeserializer<
            unknown,
            Record<string, unknown>
        >;
        let init: ((value: unknown) => Uint8Array) | undefined;

        if (lengthOrField === 0) {
            serialize = () => {};

            if (converter) {
                // eslint-disable-next-line require-yield
                deserialize = function* () {
                    return converter.convert(EmptyUint8Array);
                };
            } else {
                // eslint-disable-next-line require-yield
                deserialize = function* () {
                    return EmptyUint8Array;
                };
            }
        } else {
            serialize = (value, { buffer, index }) =>
                copyMaybeDifferentLength(buffer, value, index, lengthOrField);

            if (converter) {
                deserialize = function* (then, reader) {
                    const array = reader.readExactly(lengthOrField);
                    return converter.convert(yield* then(array));
                };
                init = (value) => converter.back(value);
            } else {
                // eslint-disable-next-line require-yield
                deserialize = function* (_then, reader) {
                    const array = reader.readExactly(lengthOrField);
                    return array;
                };
            }
        }

        return field(lengthOrField, "byob", serialize, deserialize, { init });
    }

    // Declare length field
    // Some field types are `function`s
    if (
        (typeof lengthOrField === "object" ||
            typeof lengthOrField === "function") &&
        "serialize" in lengthOrField
    ) {
        let deserialize: BipedalFieldDeserializer<
            unknown,
            Record<string, unknown>
        >;
        let init: ((value: unknown) => Uint8Array) | undefined;

        if (converter) {
            deserialize = function* (then, reader, context) {
                const length = yield* then(
                    lengthOrField.deserialize(reader, context),
                );
                const array =
                    length !== 0 ? reader.readExactly(length) : EmptyUint8Array;
                return converter.convert(yield* then(array));
            };
            init = (value) => converter.back(value);
        } else {
            deserialize = function* (then, reader, context) {
                const length = yield* then(
                    lengthOrField.deserialize(reader, context),
                );
                const array =
                    length !== 0 ? reader.readExactly(length) : EmptyUint8Array;
                return array;
            };
        }

        return field(
            lengthOrField.size,
            "default",
            (value, { littleEndian }) => {
                if (lengthOrField.type === "default") {
                    const lengthBuffer = lengthOrField.serialize(value.length, {
                        littleEndian,
                    });

                    if (value.length === 0) {
                        return lengthBuffer;
                    }

                    const result = new Uint8Array(
                        lengthBuffer.length + value.length,
                    );
                    result.set(lengthBuffer, 0);
                    result.set(value, lengthBuffer.length);
                    return result;
                } else {
                    const result = new Uint8Array(
                        lengthOrField.size + value.length,
                    );
                    lengthOrField.serialize(value.length, {
                        buffer: result,
                        index: 0,
                        littleEndian,
                    });
                    result.set(value, lengthOrField.size);
                    return result;
                }
            },
            deserialize,
            { init },
        );
    }

    // Reference existing length field
    if (typeof lengthOrField === "string") {
        let deserialize: BipedalFieldDeserializer<
            unknown,
            Record<string, unknown>
        >;
        let init: (
            value: unknown,
            dependencies: Record<string, unknown>,
        ) => Uint8Array;

        if (converter) {
            deserialize = function* (then, reader, { dependencies }) {
                const length = dependencies[lengthOrField] as number;
                const array =
                    length !== 0 ? reader.readExactly(length) : EmptyUint8Array;
                return converter.convert(yield* then(array));
            };
            init = (value, dependencies) => {
                const array = converter.back(value);
                dependencies[lengthOrField] = array.length;
                return array;
            };
        } else {
            // eslint-disable-next-line require-yield
            deserialize = function* (_then, reader, { dependencies }) {
                const length = dependencies[lengthOrField] as number;
                const array =
                    length !== 0 ? reader.readExactly(length) : EmptyUint8Array;
                return array;
            };
            init = (value, dependencies) => {
                const array = value as Uint8Array;
                dependencies[lengthOrField] = array.length;
                return array;
            };
        }

        return field(0, "default", (source) => source, deserialize, { init });
    }

    let deserialize: BipedalFieldDeserializer<unknown, Record<string, unknown>>;
    let init: (
        value: unknown,
        dependencies: Record<string, unknown>,
    ) => Uint8Array;

    // Reference existing length field + length converter
    if (converter) {
        deserialize = function* (then, reader, { dependencies }) {
            const rawLength = dependencies[lengthOrField.field];
            const length = lengthOrField.convert(rawLength);
            const array =
                length !== 0 ? reader.readExactly(length) : EmptyUint8Array;
            return converter.convert(yield* then(array));
        };
        init = (value, dependencies) => {
            const array = converter.back(value);
            dependencies[lengthOrField.field] = lengthOrField.back(
                array.length,
            );
            return array;
        };
    } else {
        // eslint-disable-next-line require-yield
        deserialize = function* (_then, reader, { dependencies }) {
            const rawLength = dependencies[lengthOrField.field];
            const length = lengthOrField.convert(rawLength);
            const array =
                length !== 0 ? reader.readExactly(length) : EmptyUint8Array;
            return array;
        };
        init = (value, dependencies) => {
            const array = value as Uint8Array;
            dependencies[lengthOrField.field] = lengthOrField.back(
                array.length,
            );
            return array;
        };
    }

    return field(0, "default", (source) => source, deserialize, { init });
}
