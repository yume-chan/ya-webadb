import * as assert from "node:assert";
import { describe, it, mock } from "node:test";

import type {
    AsyncExactReadable,
    ExactReadable,
    StructFieldValue,
    StructOptions,
    StructValue,
} from "./basic/index.js";
import { StructDefaultOptions, StructFieldDefinition } from "./basic/index.js";
import { Struct } from "./struct.js";
import type { ValueOrPromise } from "./utils.js";

import {
    BigIntFieldDefinition,
    BigIntFieldVariant,
    BufferFieldConverter,
    FixedLengthBufferLikeFieldDefinition,
    NumberFieldDefinition,
    NumberFieldVariant,
    VariableLengthBufferLikeFieldDefinition,
} from "./index.js";

class MockDeserializationStream implements ExactReadable {
    buffer = new Uint8Array(0);

    position = 0;

    readExactly = mock.fn(() => this.buffer);
}

describe("Struct", () => {
    describe(".constructor", () => {
        it("should initialize fields", () => {
            const struct = new Struct();
            assert.deepStrictEqual(struct.options, StructDefaultOptions);
            assert.strictEqual(struct.size, 0);
        });
    });

    describe("#field", () => {
        class MockFieldDefinition extends StructFieldDefinition<number> {
            constructor(size: number) {
                super(size);
            }

            getSize = mock.fn(() => {
                return this.options;
            });

            override create(
                options: Readonly<StructOptions>,
                struct: StructValue,
                value: unknown,
            ): StructFieldValue<this> {
                void options;
                void struct;
                void value;
                throw new Error("Method not implemented.");
            }
            override deserialize(
                options: Readonly<StructOptions>,
                stream: ExactReadable,
                struct: StructValue,
            ): StructFieldValue<this>;
            override deserialize(
                options: Readonly<StructOptions>,
                stream: AsyncExactReadable,
                struct: StructValue,
            ): Promise<StructFieldValue<this>>;
            override deserialize(
                options: Readonly<StructOptions>,
                stream: ExactReadable | AsyncExactReadable,
                struct: StructValue,
            ): ValueOrPromise<StructFieldValue<this>> {
                void options;
                void stream;
                void struct;
                throw new Error("Method not implemented.");
            }
        }

        it("should push a field and update size", () => {
            const struct = new Struct();

            const field1 = "foo";
            const fieldDefinition1 = new MockFieldDefinition(4);

            struct.field(field1, fieldDefinition1);
            assert.strictEqual(struct.size, 4);
            assert.strictEqual(fieldDefinition1.getSize.mock.callCount(), 1);
            assert.deepStrictEqual(struct.fields, [[field1, fieldDefinition1]]);

            const field2 = "bar";
            const fieldDefinition2 = new MockFieldDefinition(8);
            struct.field(field2, fieldDefinition2);
            assert.strictEqual(struct.size, 12);
            assert.strictEqual(fieldDefinition2.getSize.mock.callCount(), 1);
            assert.deepStrictEqual(struct.fields, [
                [field1, fieldDefinition1],
                [field2, fieldDefinition2],
            ]);
        });

        it("should throw an error if field name already exists", () => {
            const struct = new Struct();
            const fieldName = "foo";
            struct.field(fieldName, new MockFieldDefinition(4));
            assert.throws(() => {
                struct.field(fieldName, new MockFieldDefinition(4));
            });
        });
    });

    describe("#number", () => {
        it("`int8` should append an `int8` field", () => {
            const struct = new Struct();
            struct.int8("foo");
            assert.strictEqual(struct.size, 1);

            const definition = struct.fields[0]![1] as NumberFieldDefinition;
            assert.ok(definition instanceof NumberFieldDefinition);
            assert.strictEqual(definition.variant, NumberFieldVariant.Int8);
        });

        it("`uint8` should append an `uint8` field", () => {
            const struct = new Struct();
            struct.uint8("foo");
            assert.strictEqual(struct.size, 1);

            const definition = struct.fields[0]![1] as NumberFieldDefinition;
            assert.ok(definition instanceof NumberFieldDefinition);
            assert.strictEqual(definition.variant, NumberFieldVariant.Uint8);
        });

        it("`int16` should append an `int16` field", () => {
            const struct = new Struct();
            struct.int16("foo");
            assert.strictEqual(struct.size, 2);

            const definition = struct.fields[0]![1] as NumberFieldDefinition;
            assert.ok(definition instanceof NumberFieldDefinition);
            assert.strictEqual(definition.variant, NumberFieldVariant.Int16);
        });

        it("`uint16` should append an `uint16` field", () => {
            const struct = new Struct();
            struct.uint16("foo");
            assert.strictEqual(struct.size, 2);

            const definition = struct.fields[0]![1] as NumberFieldDefinition;
            assert.ok(definition instanceof NumberFieldDefinition);
            assert.strictEqual(definition.variant, NumberFieldVariant.Uint16);
        });

        it("`int32` should append an `int32` field", () => {
            const struct = new Struct();
            struct.int32("foo");
            assert.strictEqual(struct.size, 4);

            const definition = struct.fields[0]![1] as NumberFieldDefinition;
            assert.ok(definition instanceof NumberFieldDefinition);
            assert.strictEqual(definition.variant, NumberFieldVariant.Int32);
        });

        it("`uint32` should append an `uint32` field", () => {
            const struct = new Struct();
            struct.uint32("foo");
            assert.strictEqual(struct.size, 4);

            const definition = struct.fields[0]![1] as NumberFieldDefinition;
            assert.ok(definition instanceof NumberFieldDefinition);
            assert.strictEqual(definition.variant, NumberFieldVariant.Uint32);
        });

        it("`int64` should append an `int64` field", () => {
            const struct = new Struct();
            struct.int64("foo");
            assert.strictEqual(struct.size, 8);

            const definition = struct.fields[0]![1] as BigIntFieldDefinition;
            assert.ok(definition instanceof BigIntFieldDefinition);
            assert.strictEqual(definition.variant, BigIntFieldVariant.Int64);
        });

        it("`uint64` should append an `uint64` field", () => {
            const struct = new Struct();
            struct.uint64("foo");
            assert.strictEqual(struct.size, 8);

            const definition = struct.fields[0]![1] as BigIntFieldDefinition;
            assert.ok(definition instanceof BigIntFieldDefinition);
            assert.strictEqual(definition.variant, BigIntFieldVariant.Uint64);
        });

        describe("#uint8ArrayLike", () => {
            describe("FixedLengthBufferLikeFieldDefinition", () => {
                it("`#uint8Array` with fixed length", () => {
                    const struct = new Struct();
                    struct.uint8Array("foo", { length: 10 });
                    assert.strictEqual(struct.size, 10);

                    const definition = struct
                        .fields[0]![1] as FixedLengthBufferLikeFieldDefinition;
                    assert.ok(
                        definition instanceof
                            FixedLengthBufferLikeFieldDefinition,
                    );
                    assert.ok(
                        definition.converter instanceof BufferFieldConverter,
                    );
                    assert.strictEqual(definition.options.length, 10);
                });

                it("`#string` with fixed length", () => {
                    const struct = new Struct();
                    struct.string("foo", { length: 10 });
                    assert.strictEqual(struct.size, 10);

                    const definition = struct
                        .fields[0]![1] as FixedLengthBufferLikeFieldDefinition;
                    assert.ok(
                        definition instanceof
                            FixedLengthBufferLikeFieldDefinition,
                    );
                    assert.ok(
                        definition.converter instanceof BufferFieldConverter,
                    );
                    assert.strictEqual(definition.options.length, 10);
                });
            });

            describe("VariableLengthBufferLikeFieldDefinition", () => {
                it("`#uint8Array` with variable length", () => {
                    const struct = new Struct().int8("barLength");
                    assert.strictEqual(struct.size, 1);

                    struct.uint8Array("bar", { lengthField: "barLength" });
                    assert.strictEqual(struct.size, 1);

                    const definition = struct
                        .fields[1]![1] as VariableLengthBufferLikeFieldDefinition;
                    assert.ok(
                        definition instanceof
                            VariableLengthBufferLikeFieldDefinition,
                    );
                    assert.ok(
                        definition.converter instanceof BufferFieldConverter,
                    );
                    assert.strictEqual(
                        definition.options.lengthField,
                        "barLength",
                    );
                });

                it("`#string` with variable length", () => {
                    const struct = new Struct().int8("barLength");
                    assert.strictEqual(struct.size, 1);

                    struct.string("bar", { lengthField: "barLength" });
                    assert.strictEqual(struct.size, 1);

                    const definition = struct
                        .fields[1]![1] as VariableLengthBufferLikeFieldDefinition;
                    assert.ok(
                        definition instanceof
                            VariableLengthBufferLikeFieldDefinition,
                    );
                    assert.ok(
                        definition.converter instanceof BufferFieldConverter,
                    );
                    assert.strictEqual(
                        definition.options.lengthField,
                        "barLength",
                    );
                });
            });
        });

        describe("#concat", () => {
            it("should append all fields from other struct", () => {
                const sub = new Struct().int16("int16").int32("int32");

                const struct = new Struct()
                    .int8("int8")
                    .concat(sub)
                    .int64("int64");

                const field0 = struct.fields[0]!;
                assert.strictEqual(field0[0], "int8");
                assert.strictEqual(
                    (field0[1] as NumberFieldDefinition).variant,
                    NumberFieldVariant.Int8,
                );

                const field1 = struct.fields[1]!;
                assert.strictEqual(field1[0], "int16");
                assert.strictEqual(
                    (field1[1] as NumberFieldDefinition).variant,
                    NumberFieldVariant.Int16,
                );

                const field2 = struct.fields[2]!;
                assert.strictEqual(field2[0], "int32");
                assert.strictEqual(
                    (field2[1] as NumberFieldDefinition).variant,
                    NumberFieldVariant.Int32,
                );
            });
        });

        describe("#deserialize", () => {
            it("should deserialize without dynamic size fields", () => {
                const struct = new Struct().int8("foo").int16("bar");

                const stream = new MockDeserializationStream();
                stream.readExactly.mock.mockImplementationOnce(
                    () => new Uint8Array([2]),
                    0,
                );
                stream.readExactly.mock.mockImplementationOnce(
                    () => new Uint8Array([0, 16]),
                    1,
                );

                const result = struct.deserialize(stream);
                assert.deepEqual(result, { foo: 2, bar: 16 });

                assert.strictEqual(stream.readExactly.mock.callCount(), 2);
                assert.deepStrictEqual(
                    stream.readExactly.mock.calls[0]!.arguments,
                    [1],
                );
                assert.deepStrictEqual(
                    stream.readExactly.mock.calls[1]!.arguments,
                    [2],
                );
            });

            it("should deserialize with dynamic size fields", () => {
                const struct = new Struct()
                    .int8("fooLength")
                    .uint8Array("foo", { lengthField: "fooLength" });

                const stream = new MockDeserializationStream();
                stream.readExactly.mock.mockImplementationOnce(
                    () => new Uint8Array([2]),
                    0,
                );
                stream.readExactly.mock.mockImplementationOnce(
                    () => new Uint8Array([3, 4]),
                    1,
                );

                const result = struct.deserialize(stream);
                assert.deepEqual(result, {
                    get fooLength() {
                        return 2;
                    },
                    get foo() {
                        return new Uint8Array([3, 4]);
                    },
                });
                assert.strictEqual(stream.readExactly.mock.callCount(), 2);
                assert.deepStrictEqual(
                    stream.readExactly.mock.calls[0]!.arguments,
                    [1],
                );
                assert.deepStrictEqual(
                    stream.readExactly.mock.calls[1]!.arguments,
                    [2],
                );
            });
        });

        describe("#extra", () => {
            it("should accept plain field", () => {
                const struct = new Struct().extra({ foo: 42, bar: true });

                const stream = new MockDeserializationStream();
                const result = struct.deserialize(stream);

                assert.deepStrictEqual(
                    Object.entries(
                        Object.getOwnPropertyDescriptors(
                            Object.getPrototypeOf(result),
                        ),
                    ),
                    [
                        [
                            "foo",
                            {
                                configurable: true,
                                enumerable: true,
                                writable: true,
                                value: 42,
                            },
                        ],
                        [
                            "bar",
                            {
                                configurable: true,
                                enumerable: true,
                                writable: true,
                                value: true,
                            },
                        ],
                    ],
                );
            });

            it("should accept accessors", () => {
                const struct = new Struct().extra({
                    get foo() {
                        return 42;
                    },
                    get bar() {
                        return true;
                    },
                    set bar(value) {
                        void value;
                    },
                });

                const stream = new MockDeserializationStream();
                const result = struct.deserialize(stream);

                const properties = Object.getOwnPropertyDescriptors(
                    Object.getPrototypeOf(result),
                );
                assert.strictEqual(properties.foo?.configurable, true);
                assert.strictEqual(properties.foo?.enumerable, true);
                assert.strictEqual(properties.bar?.configurable, true);
                assert.strictEqual(properties.bar?.enumerable, true);
            });
        });

        describe("#postDeserialize", () => {
            it("can throw errors", () => {
                const struct = new Struct();
                const callback = mock.fn(() => {
                    throw new Error("mock");
                });
                struct.postDeserialize(callback);

                const stream = new MockDeserializationStream();
                assert.throws(() => struct.deserialize(stream), /mock/);
                assert.strictEqual(callback.mock.callCount(), 1);
            });

            it("can replace return value", () => {
                const struct = new Struct();
                const callback = mock.fn(() => "mock");
                struct.postDeserialize(callback);

                const stream = new MockDeserializationStream();
                assert.strictEqual(struct.deserialize(stream), "mock");
                assert.strictEqual(callback.mock.callCount(), 1);
                assert.deepEqual(callback.mock.calls[0]?.arguments, [{}]);
            });

            it("can return nothing", () => {
                const struct = new Struct();
                const callback = mock.fn();
                struct.postDeserialize(callback);

                const stream = new MockDeserializationStream();
                const result = struct.deserialize(stream);

                assert.strictEqual(callback.mock.callCount(), 1);
                assert.deepEqual(callback.mock.calls[0]?.arguments, [result]);
            });

            it("should overwrite callback", () => {
                const struct = new Struct();

                const callback1 = mock.fn();
                struct.postDeserialize(callback1);

                const callback2 = mock.fn();
                struct.postDeserialize(callback2);

                const stream = new MockDeserializationStream();
                struct.deserialize(stream);

                assert.strictEqual(callback1.mock.callCount(), 0);
                assert.strictEqual(callback2.mock.callCount(), 1);
                assert.deepEqual(callback2.mock.calls[0]?.arguments, [{}]);
            });
        });

        describe("#serialize", () => {
            it("should serialize without dynamic size fields", () => {
                const struct = new Struct().int8("foo").int16("bar");

                const result = new Uint8Array(
                    struct.serialize({ foo: 0x42, bar: 0x1024 }),
                );

                assert.deepStrictEqual(
                    result,
                    new Uint8Array([0x42, 0x10, 0x24]),
                );
            });

            it("should serialize with dynamic size fields", () => {
                const struct = new Struct()
                    .int8("fooLength")
                    .uint8Array("foo", { lengthField: "fooLength" });

                const result = new Uint8Array(
                    struct.serialize({
                        foo: new Uint8Array([0x03, 0x04, 0x05]),
                    }),
                );

                assert.deepStrictEqual(
                    result,
                    new Uint8Array([0x03, 0x03, 0x04, 0x05]),
                );
            });
        });
    });
});
