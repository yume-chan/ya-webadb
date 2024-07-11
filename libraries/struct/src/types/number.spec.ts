import { describe, expect, it, jest, test } from "@jest/globals";

import type { ExactReadable } from "../basic/index.js";
import { StructDefaultOptions, StructValue } from "../basic/index.js";

import { NumberFieldDefinition, NumberFieldVariant } from "./number.js";

function testEndian(
    type: NumberFieldVariant,
    min: number,
    max: number,
    littleEndian: boolean,
) {
    test(`min = ${min}`, () => {
        const buffer = new ArrayBuffer(type.size);
        const view = new DataView(buffer);
        (
            view[
                `set${type.signed ? "I" : "Ui"}nt${
                    type.size * 8
                }` as keyof DataView
            ] as (offset: number, value: number, littleEndian: boolean) => void
        )(0, min, littleEndian);
        const output = type.deserialize(new Uint8Array(buffer), littleEndian);
        expect(output).toBe(min);
    });

    test("1", () => {
        const buffer = new ArrayBuffer(type.size);
        const view = new DataView(buffer);
        const input = 1;
        (
            view[
                `set${type.signed ? "I" : "Ui"}nt${
                    type.size * 8
                }` as keyof DataView
            ] as (offset: number, value: number, littleEndian: boolean) => void
        )(0, input, littleEndian);
        const output = type.deserialize(new Uint8Array(buffer), littleEndian);
        expect(output).toBe(input);
    });

    test(`max = ${max}`, () => {
        const buffer = new ArrayBuffer(type.size);
        const view = new DataView(buffer);
        (
            view[
                `set${type.signed ? "I" : "Ui"}nt${
                    type.size * 8
                }` as keyof DataView
            ] as (offset: number, value: number, littleEndian: boolean) => void
        )(0, max, littleEndian);
        const output = type.deserialize(new Uint8Array(buffer), littleEndian);
        expect(output).toBe(max);
    });
}

function testDeserialize(type: NumberFieldVariant) {
    if (type.size === 1) {
        if (type.signed) {
            const MIN = -(2 ** (type.size * 8 - 1));
            const MAX = -MIN - 1;
            testEndian(type, MIN, MAX, false);
        } else {
            const MAX = 2 ** (type.size * 8) - 1;
            testEndian(type, 0, MAX, false);
        }
    } else {
        if (type.signed) {
            const MIN = -(2 ** (type.size * 8 - 1));
            const MAX = -MIN - 1;
            describe("big endian", () => {
                testEndian(type, MIN, MAX, false);
            });
            describe("little endian", () => {
                testEndian(type, MIN, MAX, true);
            });
        } else {
            const MAX = 2 ** (type.size * 8) - 1;
            describe("big endian", () => {
                testEndian(type, 0, MAX, false);
            });
            describe("little endian", () => {
                testEndian(type, 0, MAX, true);
            });
        }
    }
}

describe("Types", () => {
    describe("Number", () => {
        describe("NumberFieldVariant", () => {
            describe("Int8", () => {
                const key = "Int8";

                test("basic", () => {
                    expect(NumberFieldVariant[key]).toHaveProperty("size", 1);
                });

                testDeserialize(NumberFieldVariant[key]);
            });

            describe("Uint8", () => {
                const key = "Uint8";

                test("basic", () => {
                    expect(NumberFieldVariant[key]).toHaveProperty("size", 1);
                });

                testDeserialize(NumberFieldVariant[key]);
            });

            describe("Int16", () => {
                const key = "Int16";

                test("basic", () => {
                    expect(NumberFieldVariant[key]).toHaveProperty("size", 2);
                });

                testDeserialize(NumberFieldVariant[key]);
            });

            describe("Uint16", () => {
                const key = "Uint16";

                test("basic", () => {
                    expect(NumberFieldVariant[key]).toHaveProperty("size", 2);
                });

                testDeserialize(NumberFieldVariant[key]);
            });

            describe("Int32", () => {
                const key = "Int32";

                test("basic", () => {
                    expect(NumberFieldVariant[key]).toHaveProperty("size", 4);
                });

                testDeserialize(NumberFieldVariant[key]);
            });

            describe("Uint32", () => {
                const key = "Uint32";

                test("basic", () => {
                    expect(NumberFieldVariant[key]).toHaveProperty("size", 4);
                });

                testDeserialize(NumberFieldVariant[key]);
            });
        });

        describe("NumberFieldDefinition", () => {
            describe("#getSize", () => {
                it("should return size of its type", () => {
                    expect(
                        new NumberFieldDefinition(
                            NumberFieldVariant.Int8,
                        ).getSize(),
                    ).toBe(1);
                    expect(
                        new NumberFieldDefinition(
                            NumberFieldVariant.Uint8,
                        ).getSize(),
                    ).toBe(1);
                    expect(
                        new NumberFieldDefinition(
                            NumberFieldVariant.Int16,
                        ).getSize(),
                    ).toBe(2);
                    expect(
                        new NumberFieldDefinition(
                            NumberFieldVariant.Uint16,
                        ).getSize(),
                    ).toBe(2);
                    expect(
                        new NumberFieldDefinition(
                            NumberFieldVariant.Int32,
                        ).getSize(),
                    ).toBe(4);
                    expect(
                        new NumberFieldDefinition(
                            NumberFieldVariant.Uint32,
                        ).getSize(),
                    ).toBe(4);
                });
            });

            describe("#deserialize", () => {
                it("should deserialize Uint8", () => {
                    const readExactly = jest.fn(
                        () => new Uint8Array([1, 2, 3, 4]),
                    );
                    const stream: ExactReadable = { position: 0, readExactly };

                    const definition = new NumberFieldDefinition(
                        NumberFieldVariant.Uint8,
                    );
                    const struct = new StructValue({});
                    const value = definition.deserialize(
                        StructDefaultOptions,
                        stream,
                        struct,
                    );

                    expect(value.get()).toBe(1);
                    expect(readExactly).toHaveBeenCalledTimes(1);
                    expect(readExactly).toHaveBeenCalledWith(
                        NumberFieldVariant.Uint8.size,
                    );
                });

                it("should deserialize Uint16", () => {
                    const readExactly = jest.fn(
                        () => new Uint8Array([1, 2, 3, 4]),
                    );
                    const stream: ExactReadable = { position: 0, readExactly };

                    const definition = new NumberFieldDefinition(
                        NumberFieldVariant.Uint16,
                    );
                    const struct = new StructValue({});
                    const value = definition.deserialize(
                        StructDefaultOptions,
                        stream,
                        struct,
                    );

                    expect(value.get()).toBe((1 << 8) | 2);
                    expect(readExactly).toHaveBeenCalledTimes(1);
                    expect(readExactly).toHaveBeenCalledWith(
                        NumberFieldVariant.Uint16.size,
                    );
                });

                it("should deserialize Uint16LE", () => {
                    const readExactly = jest.fn(
                        () => new Uint8Array([1, 2, 3, 4]),
                    );
                    const stream: ExactReadable = { position: 0, readExactly };

                    const definition = new NumberFieldDefinition(
                        NumberFieldVariant.Uint16,
                    );
                    const struct = new StructValue({});
                    const value = definition.deserialize(
                        { ...StructDefaultOptions, littleEndian: true },
                        stream,
                        struct,
                    );

                    expect(value.get()).toBe((2 << 8) | 1);
                    expect(readExactly).toHaveBeenCalledTimes(1);
                    expect(readExactly).toHaveBeenCalledWith(
                        NumberFieldVariant.Uint16.size,
                    );
                });
            });
        });

        describe("NumberFieldValue", () => {
            describe("#getSize", () => {
                it("should return size of its definition", () => {
                    const struct = new StructValue({});

                    expect(
                        new NumberFieldDefinition(NumberFieldVariant.Int8)
                            .create(StructDefaultOptions, struct, 42)
                            .getSize(),
                    ).toBe(1);

                    expect(
                        new NumberFieldDefinition(NumberFieldVariant.Uint8)
                            .create(StructDefaultOptions, struct, 42)
                            .getSize(),
                    ).toBe(1);

                    expect(
                        new NumberFieldDefinition(NumberFieldVariant.Int16)
                            .create(StructDefaultOptions, struct, 42)
                            .getSize(),
                    ).toBe(2);

                    expect(
                        new NumberFieldDefinition(NumberFieldVariant.Uint16)
                            .create(StructDefaultOptions, struct, 42)
                            .getSize(),
                    ).toBe(2);

                    expect(
                        new NumberFieldDefinition(NumberFieldVariant.Int32)
                            .create(StructDefaultOptions, struct, 42)
                            .getSize(),
                    ).toBe(4);

                    expect(
                        new NumberFieldDefinition(NumberFieldVariant.Uint32)
                            .create(StructDefaultOptions, struct, 42)
                            .getSize(),
                    ).toBe(4);
                });
            });

            describe("#serialize", () => {
                it("should serialize uint8", () => {
                    const definition = new NumberFieldDefinition(
                        NumberFieldVariant.Int8,
                    );
                    const struct = new StructValue({});
                    const value = definition.create(
                        StructDefaultOptions,
                        struct,
                        42,
                    );

                    const array = new Uint8Array(10);
                    value.serialize(array, 2);

                    expect(Array.from(array)).toEqual([
                        0, 0, 42, 0, 0, 0, 0, 0, 0, 0,
                    ]);
                });
            });
        });
    });
});
