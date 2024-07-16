import * as assert from "node:assert";
import { describe, it, mock } from "node:test";

import type { ExactReadable } from "../basic/index.js";
import { StructDefaultOptions, StructValue } from "../basic/index.js";

import { NumberFieldDefinition, NumberFieldVariant } from "./number.js";

function testEndian(
    type: NumberFieldVariant,
    min: number,
    max: number,
    littleEndian: boolean,
) {
    it(`min = ${min}`, () => {
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
        assert.strictEqual(output, min);
    });

    it("1", () => {
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
        assert.strictEqual(output, input);
    });

    it(`max = ${max}`, () => {
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
        assert.strictEqual(output, max);
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

                it("basic", () => {
                    assert.strictEqual(NumberFieldVariant[key].size, 1);
                });

                testDeserialize(NumberFieldVariant[key]);
            });

            describe("Uint8", () => {
                const key = "Uint8";

                it("basic", () => {
                    assert.strictEqual(NumberFieldVariant[key].size, 1);
                });

                testDeserialize(NumberFieldVariant[key]);
            });

            describe("Int16", () => {
                const key = "Int16";

                it("basic", () => {
                    assert.strictEqual(NumberFieldVariant[key].size, 2);
                });

                testDeserialize(NumberFieldVariant[key]);
            });

            describe("Uint16", () => {
                const key = "Uint16";

                it("basic", () => {
                    assert.strictEqual(NumberFieldVariant[key].size, 2);
                });

                testDeserialize(NumberFieldVariant[key]);
            });

            describe("Int32", () => {
                const key = "Int32";

                it("basic", () => {
                    assert.strictEqual(NumberFieldVariant[key].size, 4);
                });

                testDeserialize(NumberFieldVariant[key]);
            });

            describe("Uint32", () => {
                const key = "Uint32";

                it("basic", () => {
                    assert.strictEqual(NumberFieldVariant[key].size, 4);
                });

                testDeserialize(NumberFieldVariant[key]);
            });
        });

        describe("NumberFieldDefinition", () => {
            describe("#getSize", () => {
                it("should return size of its type", () => {
                    assert.strictEqual(
                        new NumberFieldDefinition(
                            NumberFieldVariant.Int8,
                        ).getSize(),
                        1,
                    );
                    assert.strictEqual(
                        new NumberFieldDefinition(
                            NumberFieldVariant.Uint8,
                        ).getSize(),
                        1,
                    );
                    assert.strictEqual(
                        new NumberFieldDefinition(
                            NumberFieldVariant.Int16,
                        ).getSize(),
                        2,
                    );
                    assert.strictEqual(
                        new NumberFieldDefinition(
                            NumberFieldVariant.Uint16,
                        ).getSize(),
                        2,
                    );
                    assert.strictEqual(
                        new NumberFieldDefinition(
                            NumberFieldVariant.Int32,
                        ).getSize(),
                        4,
                    );
                    assert.strictEqual(
                        new NumberFieldDefinition(
                            NumberFieldVariant.Uint32,
                        ).getSize(),
                        4,
                    );
                });
            });

            describe("#deserialize", () => {
                it("should deserialize Uint8", () => {
                    const readExactly = mock.fn(
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

                    assert.strictEqual(value.get(), 1);
                    assert.strictEqual(readExactly.mock.callCount(), 1);
                    assert.deepStrictEqual(
                        readExactly.mock.calls[0]?.arguments,
                        [NumberFieldVariant.Uint8.size],
                    );
                });

                it("should deserialize Uint16", () => {
                    const readExactly = mock.fn(
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

                    assert.strictEqual(value.get(), (1 << 8) | 2);
                    assert.strictEqual(readExactly.mock.callCount(), 1);
                    assert.deepStrictEqual(
                        readExactly.mock.calls[0]?.arguments,
                        [NumberFieldVariant.Uint16.size],
                    );
                });

                it("should deserialize Uint16LE", () => {
                    const readExactly = mock.fn(
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

                    assert.strictEqual(value.get(), (2 << 8) | 1);
                    assert.strictEqual(readExactly.mock.callCount(), 1);
                    assert.deepStrictEqual(
                        readExactly.mock.calls[0]?.arguments,
                        [NumberFieldVariant.Uint16.size],
                    );
                });
            });
        });

        describe("NumberFieldValue", () => {
            describe("#getSize", () => {
                it("should return size of its definition", () => {
                    const struct = new StructValue({});

                    assert.strictEqual(
                        new NumberFieldDefinition(NumberFieldVariant.Int8)
                            .create(StructDefaultOptions, struct, 42)
                            .getSize(),
                        1,
                    );

                    assert.strictEqual(
                        new NumberFieldDefinition(NumberFieldVariant.Uint8)
                            .create(StructDefaultOptions, struct, 42)
                            .getSize(),
                        1,
                    );

                    assert.strictEqual(
                        new NumberFieldDefinition(NumberFieldVariant.Int16)
                            .create(StructDefaultOptions, struct, 42)
                            .getSize(),
                        2,
                    );

                    assert.strictEqual(
                        new NumberFieldDefinition(NumberFieldVariant.Uint16)
                            .create(StructDefaultOptions, struct, 42)
                            .getSize(),
                        2,
                    );

                    assert.strictEqual(
                        new NumberFieldDefinition(NumberFieldVariant.Int32)
                            .create(StructDefaultOptions, struct, 42)
                            .getSize(),
                        4,
                    );

                    assert.strictEqual(
                        new NumberFieldDefinition(NumberFieldVariant.Uint32)
                            .create(StructDefaultOptions, struct, 42)
                            .getSize(),
                        4,
                    );
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

                    assert.deepStrictEqual(
                        Array.from(array),
                        [0, 0, 42, 0, 0, 0, 0, 0, 0, 0],
                    );
                });
            });
        });
    });
});
