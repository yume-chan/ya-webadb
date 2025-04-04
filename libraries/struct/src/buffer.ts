import type { Field } from "./field/index.js";
import { field } from "./field/index.js";

export const EmptyUint8Array = new Uint8Array(0);

export interface Converter<From, To> {
    convert: (value: From) => To;
    back: (value: To) => From;
}

export interface BufferLengthConverter<K, KT> extends Converter<KT, number> {
    field: K;
}

export interface BufferLike {
    (length: number): Field<Uint8Array, never, never, Uint8Array>;
    <U>(
        length: number,
        converter: Converter<Uint8Array, U>,
    ): Field<U, never, never, Uint8Array>;

    <K extends string>(
        lengthField: K,
    ): Field<Uint8Array, K, Record<K, number>, Uint8Array>;
    <K extends string, U>(
        lengthField: K,
        converter: Converter<Uint8Array, U>,
    ): Field<U, K, Record<K, number>, Uint8Array>;

    <K extends string, KT>(
        length: BufferLengthConverter<K, KT>,
    ): Field<Uint8Array, K, Record<K, KT>, Uint8Array>;
    <K extends string, KT, U>(
        length: BufferLengthConverter<K, KT>,
        converter: Converter<Uint8Array, U>,
    ): Field<U, K, Record<K, KT>, Uint8Array>;

    <LengthOmitInit extends string, LengthDependencies>(
        length: Field<number, LengthOmitInit, LengthDependencies, number>,
    ): Field<Uint8Array, LengthOmitInit, LengthDependencies, Uint8Array>;
    <LengthOmitInit extends string, LengthDependencies, U>(
        length: Field<number, LengthOmitInit, LengthDependencies, number>,
        converter: Converter<Uint8Array, U>,
    ): Field<U, LengthOmitInit, LengthDependencies, Uint8Array>;
}

function _buffer(length: number): Field<Uint8Array, never, never, Uint8Array>;
function _buffer<U>(
    length: number,
    converter: Converter<Uint8Array, U>,
): Field<U, never, never, Uint8Array>;

function _buffer<K extends string>(
    lengthField: K,
): Field<Uint8Array, K, Record<K, number>, Uint8Array>;
function _buffer<K extends string, U>(
    lengthField: K,
    converter: Converter<Uint8Array, U>,
): Field<U, K, Record<K, number>, Uint8Array>;

function _buffer<K extends string, KT>(
    length: BufferLengthConverter<K, KT>,
): Field<Uint8Array, K, Record<K, KT>, Uint8Array>;
function _buffer<K extends string, KT, U>(
    length: BufferLengthConverter<K, KT>,
    converter: Converter<Uint8Array, U>,
): Field<U, K, Record<K, KT>, Uint8Array>;

function _buffer<LengthOmitInit extends string, LengthDependencies>(
    length: Field<number, LengthOmitInit, LengthDependencies, number>,
): Field<Uint8Array, LengthOmitInit, LengthDependencies, Uint8Array>;
function _buffer<LengthOmitInit extends string, LengthDependencies, U>(
    length: Field<number, LengthOmitInit, LengthDependencies, number>,
    converter: Converter<Uint8Array, U>,
): Field<U, LengthOmitInit, LengthDependencies, Uint8Array>;

/* #__NO_SIDE_EFFECTS__ */
function _buffer(
    lengthOrField:
        | string
        | number
        | Field<number, string, unknown, number>
        | BufferLengthConverter<string, unknown>,
    converter?: Converter<Uint8Array, unknown>,
): Field<unknown, string, Record<string, unknown>, Uint8Array> {
    // Fixed length
    if (typeof lengthOrField === "number") {
        if (converter) {
            if (lengthOrField === 0) {
                return field(
                    0,
                    "byob",
                    () => {},
                    // eslint-disable-next-line require-yield
                    function* () {
                        return converter.convert(EmptyUint8Array);
                    },
                );
            }

            return field(
                lengthOrField,
                "byob",
                (value, { buffer, index }) => {
                    buffer.set(value.slice(0, lengthOrField), index);
                },
                function* (then, reader) {
                    const array = yield* then(
                        reader.readExactly(lengthOrField),
                    );
                    return converter.convert(array);
                },
                {
                    init(value) {
                        return converter.back(value);
                    },
                },
            );
        }

        if (lengthOrField === 0) {
            return field(
                0,
                "byob",
                () => {},
                // eslint-disable-next-line require-yield
                function* () {
                    return EmptyUint8Array;
                },
            );
        }

        return field(
            lengthOrField,
            "byob",
            (value, { buffer, index }) => {
                buffer.set(value.slice(0, lengthOrField), index);
            },
            // eslint-disable-next-line require-yield
            function* (_then, reader) {
                return reader.readExactly(lengthOrField);
            },
        );
    }

    // Declare length field
    // Some field types are `function`s
    if (
        (typeof lengthOrField === "object" ||
            typeof lengthOrField === "function") &&
        "serialize" in lengthOrField
    ) {
        if (converter) {
            return field(
                lengthOrField.size,
                "default",
                (value, { littleEndian }) => {
                    if (lengthOrField.type === "default") {
                        const lengthBuffer = lengthOrField.serialize(
                            value.length,
                            { littleEndian },
                        );
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
                function* (then, reader, context) {
                    const length = yield* then(
                        lengthOrField.deserialize(reader, context),
                    );
                    const array = yield* then(reader.readExactly(length));
                    return converter.convert(array);
                },
                {
                    init(value) {
                        return converter.back(value);
                    },
                },
            );
        }

        return field(
            lengthOrField.size,
            "default",
            (value, { littleEndian }) => {
                if (lengthOrField.type === "default") {
                    const lengthBuffer = lengthOrField.serialize(value.length, {
                        littleEndian,
                    });
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
            function* (then, reader, context) {
                const length = yield* then(
                    lengthOrField.deserialize(reader, context),
                );
                return yield* then(reader.readExactly(length));
            },
        );
    }

    // Reference exiting length field
    if (typeof lengthOrField === "string") {
        if (converter) {
            return field(
                0,
                "default",
                (source) => source,
                // eslint-disable-next-line require-yield
                function* (_then, reader, { dependencies }) {
                    const length = dependencies[lengthOrField] as number;
                    if (length === 0) {
                        return EmptyUint8Array;
                    }

                    return reader.readExactly(length);
                },
                {
                    init(value, dependencies) {
                        const array = converter.back(value);
                        dependencies[lengthOrField] = array.length;
                        return array;
                    },
                },
            );
        }

        return field(
            0,
            "default",
            (source) => source,
            // eslint-disable-next-line require-yield
            function* (_then, reader, { dependencies }) {
                const length = dependencies[lengthOrField] as number;
                if (length === 0) {
                    return EmptyUint8Array;
                }

                return reader.readExactly(length);
            },
            {
                init(value, dependencies) {
                    dependencies[lengthOrField] = (value as Uint8Array).length;
                    return undefined;
                },
            },
        );
    }

    // Reference existing length field + converter
    if (converter) {
        return field(
            0,
            "default",
            (source) => source,
            // eslint-disable-next-line require-yield
            function* (_then, reader, { dependencies }) {
                const rawLength = dependencies[lengthOrField.field];
                const length = lengthOrField.convert(rawLength);
                if (length === 0) {
                    return EmptyUint8Array;
                }

                return reader.readExactly(length);
            },
            {
                init(value, dependencies) {
                    const array = converter.back(value);
                    dependencies[lengthOrField.field] = lengthOrField.back(
                        array.length,
                    );
                    return array;
                },
            },
        );
    }

    return field(
        0,
        "default",
        (source) => source,
        // eslint-disable-next-line require-yield
        function* (_then, reader, { dependencies }) {
            const rawLength = dependencies[lengthOrField.field];
            const length = lengthOrField.convert(rawLength);
            if (length === 0) {
                return EmptyUint8Array;
            }

            return reader.readExactly(length);
        },
        {
            init(value, dependencies) {
                dependencies[lengthOrField.field] = lengthOrField.back(
                    (value as Uint8Array).length,
                );
                return undefined;
            },
        },
    );
}

export const buffer = _buffer;
