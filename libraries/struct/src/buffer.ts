import { bipedal } from "./bipedal.js";
import type { Field } from "./field.js";

export interface Converter<From, To> {
    convert: (value: From) => To;
    back: (value: To) => From;
}

export interface BufferLengthConverter<K, KT> extends Converter<KT, number> {
    field: K;
}

export interface BufferLike {
    (length: number): Field<Uint8Array, never, never>;
    <U>(
        length: number,
        converter: Converter<Uint8Array, U>,
    ): Field<U, never, never>;

    <K extends string>(lengthField: K): Field<Uint8Array, K, Record<K, number>>;
    <K extends string, U>(
        lengthField: K,
        converter: Converter<Uint8Array, U>,
    ): Field<U, K, Record<K, number>>;

    <K extends string, KT>(
        length: BufferLengthConverter<K, KT>,
    ): Field<Uint8Array, K, Record<K, KT>>;
    <K extends string, KT, U>(
        length: BufferLengthConverter<K, KT>,
        converter: Converter<Uint8Array, U>,
    ): Field<U, K, Record<K, KT>>;

    <KOmitInit extends string, KS>(
        length: Field<number, KOmitInit, KS>,
    ): Field<Uint8Array, KOmitInit, KS>;
    <KOmitInit extends string, KS, U>(
        length: Field<number, KOmitInit, KS>,
        converter: Converter<Uint8Array, U>,
    ): Field<U, KOmitInit, KS>;
}

export const EmptyUint8Array = new Uint8Array(0);

export const buffer: BufferLike = function (
    lengthOrField:
        | string
        | number
        | Field<number, never, unknown>
        | BufferLengthConverter<string, unknown>,
    converter?: Converter<Uint8Array, unknown>,
): Field<unknown, string, Record<string, unknown>> {
    if (typeof lengthOrField === "number") {
        if (converter) {
            if (lengthOrField === 0) {
                return {
                    size: 0,
                    serialize: () => {},
                    deserialize: () => converter.convert(EmptyUint8Array),
                };
            }

            return {
                size: lengthOrField,
                serialize: (value, { buffer, index }) => {
                    buffer.set(
                        converter.back(value).slice(0, lengthOrField),
                        index,
                    );
                },
                deserialize: bipedal(function* (then, { reader }) {
                    const array = yield* then(
                        reader.readExactly(lengthOrField),
                    );
                    return converter.convert(array);
                }),
            };
        }

        if (lengthOrField === 0) {
            return {
                size: 0,
                serialize: () => {},
                deserialize: () => EmptyUint8Array,
            };
        }

        return {
            size: lengthOrField,
            serialize: (value, { buffer, index }) => {
                buffer.set(
                    (value as Uint8Array).slice(0, lengthOrField),
                    index,
                );
            },
            deserialize: ({ reader }) => reader.readExactly(lengthOrField),
        };
    }

    // Some Field type might be `function`s
    if (
        (typeof lengthOrField === "object" ||
            typeof lengthOrField === "function") &&
        "serialize" in lengthOrField
    ) {
        if (converter) {
            return {
                size: 0,
                dynamicSize(value) {
                    const array = converter.back(value);
                    const lengthFieldSize =
                        lengthOrField.dynamicSize?.(array.length) ??
                        lengthOrField.size;
                    return lengthFieldSize + array.length;
                },
                serialize(value, context) {
                    const array = converter.back(value);
                    const lengthFieldSize =
                        lengthOrField.dynamicSize?.(array.length) ??
                        lengthOrField.size;
                    lengthOrField.serialize(array.length, context);
                    context.buffer.set(array, context.index + lengthFieldSize);
                },
                deserialize: bipedal(function* (then, context) {
                    const length = yield* then(
                        lengthOrField.deserialize(context),
                    );
                    const array = yield* then(
                        context.reader.readExactly(length),
                    );
                    return converter.convert(array);
                }),
            };
        }

        return {
            size: 0,
            dynamicSize(value) {
                const lengthFieldSize =
                    lengthOrField.dynamicSize?.((value as Uint8Array).length) ??
                    lengthOrField.size;
                return lengthFieldSize + (value as Uint8Array).length;
            },
            serialize(value, context) {
                const lengthFieldSize =
                    lengthOrField.dynamicSize?.((value as Uint8Array).length) ??
                    lengthOrField.size;
                lengthOrField.serialize((value as Uint8Array).length, context);
                context.buffer.set(
                    value as Uint8Array,
                    context.index + lengthFieldSize,
                );
            },
            deserialize: bipedal(function* (then, context) {
                const length = yield* then(lengthOrField.deserialize(context));
                return context.reader.readExactly(length);
            }),
        };
    }

    if (typeof lengthOrField === "string") {
        if (converter) {
            return {
                size: 0,
                preSerialize: (value, runtimeStruct) => {
                    runtimeStruct[lengthOrField] = converter.back(value).length;
                },
                dynamicSize: (value) => {
                    return converter.back(value).length;
                },
                serialize: (value, { buffer, index }) => {
                    buffer.set(converter.back(value), index);
                },
                deserialize: bipedal(function* (
                    then,
                    { reader, runtimeStruct },
                ) {
                    const length = runtimeStruct[lengthOrField] as number;
                    if (length === 0) {
                        return converter.convert(EmptyUint8Array);
                    }

                    const value = yield* then(reader.readExactly(length));
                    return converter.convert(value);
                }),
            };
        }

        return {
            size: 0,
            preSerialize: (value, runtimeStruct) => {
                runtimeStruct[lengthOrField] = (value as Uint8Array).length;
            },
            dynamicSize: (value) => {
                return (value as Uint8Array).length;
            },
            serialize: (value, { buffer, index }) => {
                buffer.set(value as Uint8Array, index);
            },
            deserialize: ({ reader, runtimeStruct }) => {
                const length = runtimeStruct[lengthOrField] as number;
                if (length === 0) {
                    return EmptyUint8Array;
                }

                return reader.readExactly(length);
            },
        };
    }

    if (converter) {
        return {
            size: 0,
            preSerialize: (value, runtimeStruct) => {
                const length = converter.back(value).length;
                runtimeStruct[lengthOrField.field] = lengthOrField.back(length);
            },
            dynamicSize: (value) => {
                return converter.back(value).length;
            },
            serialize: (value, { buffer, index }) => {
                buffer.set(converter.back(value), index);
            },
            deserialize: bipedal(function* (then, { reader, runtimeStruct }) {
                const rawLength = runtimeStruct[lengthOrField.field];
                const length = lengthOrField.convert(rawLength);
                if (length === 0) {
                    return converter.convert(EmptyUint8Array);
                }

                const value = yield* then(reader.readExactly(length));
                return converter.convert(value);
            }),
        };
    }

    return {
        size: 0,
        preSerialize: (value, runtimeStruct) => {
            runtimeStruct[lengthOrField.field] = lengthOrField.back(
                (value as Uint8Array).length,
            );
        },
        dynamicSize: (value) => {
            return (value as Uint8Array).length;
        },
        serialize: (value, { buffer, index }) => {
            buffer.set(value as Uint8Array, index);
        },
        deserialize: ({ reader, runtimeStruct }) => {
            const rawLength = runtimeStruct[lengthOrField.field];
            const length = lengthOrField.convert(rawLength);
            if (length === 0) {
                return EmptyUint8Array;
            }

            return reader.readExactly(length);
        },
    };
} as never;
