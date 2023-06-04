import { describe, expect, it, jest } from "@jest/globals";

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
    BigIntFieldType,
    BufferFieldSubType,
    FixedLengthBufferLikeFieldDefinition,
    NumberFieldDefinition,
    NumberFieldType,
    VariableLengthBufferLikeFieldDefinition,
} from "./index.js";

class MockDeserializationStream implements ExactReadable {
    public buffer = new Uint8Array(0);

    public position = 0;

    public readExactly = jest.fn(() => this.buffer);
}

describe("Struct", () => {
    describe(".constructor", () => {
        it("should initialize fields", () => {
            const struct = new Struct();
            expect(struct).toHaveProperty("options", StructDefaultOptions);
            expect(struct).toHaveProperty("size", 0);
        });
    });

    describe("#field", () => {
        class MockFieldDefinition extends StructFieldDefinition<number> {
            public constructor(size: number) {
                super(size);
            }

            public getSize = jest.fn(() => {
                return this.options;
            });

            public create(
                options: Readonly<StructOptions>,
                struct: StructValue,
                value: unknown
            ): StructFieldValue<this> {
                void options;
                void struct;
                void value;
                throw new Error("Method not implemented.");
            }
            public override deserialize(
                options: Readonly<StructOptions>,
                stream: ExactReadable,
                struct: StructValue
            ): StructFieldValue<this>;
            public override deserialize(
                options: Readonly<StructOptions>,
                stream: AsyncExactReadable,
                struct: StructValue
            ): Promise<StructFieldValue<this>>;
            public override deserialize(
                options: Readonly<StructOptions>,
                stream: ExactReadable | AsyncExactReadable,
                struct: StructValue
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
            expect(struct).toHaveProperty("size", 4);
            expect(fieldDefinition1.getSize).toBeCalledTimes(1);
            expect(struct.fields).toEqual([[field1, fieldDefinition1]]);

            const field2 = "bar";
            const fieldDefinition2 = new MockFieldDefinition(8);
            struct.field(field2, fieldDefinition2);
            expect(struct).toHaveProperty("size", 12);
            expect(fieldDefinition2.getSize).toBeCalledTimes(1);
            expect(struct.fields).toEqual([
                [field1, fieldDefinition1],
                [field2, fieldDefinition2],
            ]);
        });

        it("should throw an error if field name already exists", () => {
            const struct = new Struct();
            const fieldName = "foo";
            struct.field(fieldName, new MockFieldDefinition(4));
            expect(() =>
                struct.field(fieldName, new MockFieldDefinition(4))
            ).toThrowError();
        });
    });

    describe("#number", () => {
        it("`int8` should append an `int8` field", () => {
            const struct = new Struct();
            struct.int8("foo");
            expect(struct).toHaveProperty("size", 1);

            const definition = struct.fields[0]![1] as NumberFieldDefinition;
            expect(definition).toBeInstanceOf(NumberFieldDefinition);
            expect(definition.type).toBe(NumberFieldType.Int8);
        });

        it("`uint8` should append an `uint8` field", () => {
            const struct = new Struct();
            struct.uint8("foo");
            expect(struct).toHaveProperty("size", 1);

            const definition = struct.fields[0]![1] as NumberFieldDefinition;
            expect(definition).toBeInstanceOf(NumberFieldDefinition);
            expect(definition.type).toBe(NumberFieldType.Uint8);
        });

        it("`int16` should append an `int16` field", () => {
            const struct = new Struct();
            struct.int16("foo");
            expect(struct).toHaveProperty("size", 2);

            const definition = struct.fields[0]![1] as NumberFieldDefinition;
            expect(definition).toBeInstanceOf(NumberFieldDefinition);
            expect(definition.type).toBe(NumberFieldType.Int16);
        });

        it("`uint16` should append an `uint16` field", () => {
            const struct = new Struct();
            struct.uint16("foo");
            expect(struct).toHaveProperty("size", 2);

            const definition = struct.fields[0]![1] as NumberFieldDefinition;
            expect(definition).toBeInstanceOf(NumberFieldDefinition);
            expect(definition.type).toBe(NumberFieldType.Uint16);
        });

        it("`int32` should append an `int32` field", () => {
            const struct = new Struct();
            struct.int32("foo");
            expect(struct).toHaveProperty("size", 4);

            const definition = struct.fields[0]![1] as NumberFieldDefinition;
            expect(definition).toBeInstanceOf(NumberFieldDefinition);
            expect(definition.type).toBe(NumberFieldType.Int32);
        });

        it("`uint32` should append an `uint32` field", () => {
            const struct = new Struct();
            struct.uint32("foo");
            expect(struct).toHaveProperty("size", 4);

            const definition = struct.fields[0]![1] as NumberFieldDefinition;
            expect(definition).toBeInstanceOf(NumberFieldDefinition);
            expect(definition.type).toBe(NumberFieldType.Uint32);
        });

        it("`int64` should append an `int64` field", () => {
            const struct = new Struct();
            struct.int64("foo");
            expect(struct).toHaveProperty("size", 8);

            const definition = struct.fields[0]![1] as BigIntFieldDefinition;
            expect(definition).toBeInstanceOf(BigIntFieldDefinition);
            expect(definition.type).toBe(BigIntFieldType.Int64);
        });

        it("`uint64` should append an `uint64` field", () => {
            const struct = new Struct();
            struct.uint64("foo");
            expect(struct).toHaveProperty("size", 8);

            const definition = struct.fields[0]![1] as BigIntFieldDefinition;
            expect(definition).toBeInstanceOf(BigIntFieldDefinition);
            expect(definition.type).toBe(BigIntFieldType.Uint64);
        });

        describe("#uint8ArrayLike", () => {
            describe("FixedLengthBufferLikeFieldDefinition", () => {
                it("`#uint8Array` with fixed length", () => {
                    const struct = new Struct();
                    struct.uint8Array("foo", { length: 10 });
                    expect(struct).toHaveProperty("size", 10);

                    const definition = struct
                        .fields[0]![1] as FixedLengthBufferLikeFieldDefinition;
                    expect(definition).toBeInstanceOf(
                        FixedLengthBufferLikeFieldDefinition
                    );
                    expect(definition.type).toBeInstanceOf(BufferFieldSubType);
                    expect(definition.options.length).toBe(10);
                });

                it("`#string` with fixed length", () => {
                    const struct = new Struct();
                    struct.string("foo", { length: 10 });
                    expect(struct).toHaveProperty("size", 10);

                    const definition = struct
                        .fields[0]![1] as FixedLengthBufferLikeFieldDefinition;
                    expect(definition).toBeInstanceOf(
                        FixedLengthBufferLikeFieldDefinition
                    );
                    expect(definition.type).toBeInstanceOf(BufferFieldSubType);
                    expect(definition.options.length).toBe(10);
                });
            });

            describe("VariableLengthBufferLikeFieldDefinition", () => {
                it("`#uint8Array` with variable length", () => {
                    const struct = new Struct().int8("barLength");
                    expect(struct).toHaveProperty("size", 1);

                    struct.uint8Array("bar", { lengthField: "barLength" });
                    expect(struct).toHaveProperty("size", 1);

                    const definition = struct
                        .fields[1]![1] as VariableLengthBufferLikeFieldDefinition;
                    expect(definition).toBeInstanceOf(
                        VariableLengthBufferLikeFieldDefinition
                    );
                    expect(definition.type).toBeInstanceOf(BufferFieldSubType);
                    expect(definition.options.lengthField).toBe("barLength");
                });

                it("`#string` with variable length", () => {
                    const struct = new Struct().int8("barLength");
                    expect(struct).toHaveProperty("size", 1);

                    struct.string("bar", { lengthField: "barLength" });
                    expect(struct).toHaveProperty("size", 1);

                    const definition = struct
                        .fields[1]![1] as VariableLengthBufferLikeFieldDefinition;
                    expect(definition).toBeInstanceOf(
                        VariableLengthBufferLikeFieldDefinition
                    );
                    expect(definition.type).toBeInstanceOf(BufferFieldSubType);
                    expect(definition.options.lengthField).toBe("barLength");
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
                expect(field0).toHaveProperty("0", "int8");
                expect(field0[1]).toHaveProperty("type", NumberFieldType.Int8);

                const field1 = struct.fields[1]!;
                expect(field1).toHaveProperty("0", "int16");
                expect(field1[1]).toHaveProperty("type", NumberFieldType.Int16);

                const field2 = struct.fields[2]!;
                expect(field2).toHaveProperty("0", "int32");
                expect(field2[1]).toHaveProperty("type", NumberFieldType.Int32);

                const field3 = struct.fields[3]!;
                expect(field3).toHaveProperty("0", "int64");
                expect(field3[1]).toHaveProperty("type", BigIntFieldType.Int64);
            });
        });

        describe("#deserialize", () => {
            it("should deserialize without dynamic size fields", () => {
                const struct = new Struct().int8("foo").int16("bar");

                const stream = new MockDeserializationStream();
                stream.readExactly
                    .mockReturnValueOnce(new Uint8Array([2]))
                    .mockReturnValueOnce(new Uint8Array([0, 16]));

                const result = struct.deserialize(stream);
                expect(result).toEqual({ foo: 2, bar: 16 });

                expect(stream.readExactly).toBeCalledTimes(2);
                expect(stream.readExactly).nthCalledWith(1, 1);
                expect(stream.readExactly).nthCalledWith(2, 2);
            });

            it("should deserialize with dynamic size fields", () => {
                const struct = new Struct()
                    .int8("fooLength")
                    .uint8Array("foo", { lengthField: "fooLength" });

                const stream = new MockDeserializationStream();
                stream.readExactly
                    .mockReturnValueOnce(new Uint8Array([2]))
                    .mockReturnValueOnce(new Uint8Array([3, 4]));

                const result = struct.deserialize(stream);
                expect(result).toEqual({
                    fooLength: 2,
                    foo: new Uint8Array([3, 4]),
                });
                expect(stream.readExactly).toBeCalledTimes(2);
                expect(stream.readExactly).nthCalledWith(1, 1);
                expect(stream.readExactly).nthCalledWith(2, 2);
            });
        });

        describe("#extra", () => {
            it("should accept plain field", () => {
                const struct = new Struct().extra({ foo: 42, bar: true });

                const stream = new MockDeserializationStream();
                const result = struct.deserialize(stream);

                expect(
                    Object.entries(
                        Object.getOwnPropertyDescriptors(
                            Object.getPrototypeOf(result)
                        )
                    )
                ).toEqual([
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
                ]);
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

                expect(
                    Object.entries(
                        Object.getOwnPropertyDescriptors(
                            Object.getPrototypeOf(result)
                        )
                    )
                ).toEqual([
                    [
                        "foo",
                        {
                            configurable: true,
                            enumerable: true,
                            get: expect.any(Function),
                        },
                    ],
                    [
                        "bar",
                        {
                            configurable: true,
                            enumerable: true,
                            get: expect.any(Function),
                            set: expect.any(Function),
                        },
                    ],
                ]);
            });
        });

        describe("#postDeserialize", () => {
            it("can throw errors", () => {
                const struct = new Struct();
                const callback = jest.fn(() => {
                    throw new Error("mock");
                });
                struct.postDeserialize(callback);

                const stream = new MockDeserializationStream();
                expect(() => struct.deserialize(stream)).toThrowError("mock");
                expect(callback).toBeCalledTimes(1);
            });

            it("can replace return value", () => {
                const struct = new Struct();
                const callback = jest.fn(() => "mock");
                struct.postDeserialize(callback);

                const stream = new MockDeserializationStream();
                expect(struct.deserialize(stream)).toBe("mock");
                expect(callback).toBeCalledTimes(1);
                expect(callback).toBeCalledWith({});
            });

            it("can return nothing", () => {
                const struct = new Struct();
                const callback = jest.fn();
                struct.postDeserialize(callback);

                const stream = new MockDeserializationStream();
                const result = struct.deserialize(stream);

                expect(callback).toBeCalledTimes(1);
                expect(callback).toBeCalledWith(result);
            });

            it("should overwrite callback", () => {
                const struct = new Struct();

                const callback1 = jest.fn();
                struct.postDeserialize(callback1);

                const callback2 = jest.fn();
                struct.postDeserialize(callback2);

                const stream = new MockDeserializationStream();
                struct.deserialize(stream);

                expect(callback1).toBeCalledTimes(0);
                expect(callback2).toBeCalledTimes(1);
                expect(callback2).toBeCalledWith({});
            });
        });

        describe("#serialize", () => {
            it("should serialize without dynamic size fields", () => {
                const struct = new Struct().int8("foo").int16("bar");

                const result = new Uint8Array(
                    struct.serialize({ foo: 0x42, bar: 0x1024 })
                );

                expect(result).toEqual(new Uint8Array([0x42, 0x10, 0x24]));
            });

            it("should serialize with dynamic size fields", () => {
                const struct = new Struct()
                    .int8("fooLength")
                    .uint8Array("foo", { lengthField: "fooLength" });

                const result = new Uint8Array(
                    struct.serialize({
                        foo: new Uint8Array([0x03, 0x04, 0x05]),
                    })
                );

                expect(result).toEqual(
                    new Uint8Array([0x03, 0x03, 0x04, 0x05])
                );
            });
        });
    });
});
