import { describe, expect, it, jest } from "@jest/globals";

import { StructDefaultOptions, StructValue } from "../../basic/index.js";
import type { ExactReadable } from "../../basic/index.js";

import type { BufferFieldSubType } from "./base.js";
import {
    BufferLikeFieldDefinition,
    EMPTY_UINT8_ARRAY,
    StringBufferFieldSubType,
    Uint8ArrayBufferFieldSubType,
} from "./base.js";

class MockDeserializationStream implements ExactReadable {
    public array = EMPTY_UINT8_ARRAY;

    public position = 0;

    public readExactly = jest.fn(() => this.array);
}

describe("Types", () => {
    describe("Buffer", () => {
        describe("Uint8ArrayBufferFieldSubType", () => {
            it("should have a static instance", () => {
                expect(Uint8ArrayBufferFieldSubType.Instance).toBeInstanceOf(
                    Uint8ArrayBufferFieldSubType
                );
            });

            it("`#toBuffer` should return the same `Uint8Array`", () => {
                const array = new Uint8Array(10);
                expect(
                    Uint8ArrayBufferFieldSubType.Instance.toBuffer(array)
                ).toBe(array);
            });

            it("`#fromBuffer` should return the same `Uint8Array`", () => {
                const buffer = new Uint8Array(10);
                expect(
                    Uint8ArrayBufferFieldSubType.Instance.toValue(buffer)
                ).toBe(buffer);
            });

            it("`#getSize` should return the `byteLength` of the `Uint8Array`", () => {
                const array = new Uint8Array(10);
                expect(
                    Uint8ArrayBufferFieldSubType.Instance.getSize(array)
                ).toBe(10);
            });
        });

        describe("StringBufferFieldSubType", () => {
            it("should have a static instance", () => {
                expect(StringBufferFieldSubType.Instance).toBeInstanceOf(
                    StringBufferFieldSubType
                );
            });

            it("`#toBuffer` should return the decoded string", () => {
                const text = "foo";
                const array = new Uint8Array(Buffer.from(text, "utf-8"));
                expect(
                    StringBufferFieldSubType.Instance.toBuffer(text)
                ).toEqual(array);
            });

            it("`#fromBuffer` should return the encoded ArrayBuffer", () => {
                const text = "foo";
                const array = new Uint8Array(Buffer.from(text, "utf-8"));
                expect(StringBufferFieldSubType.Instance.toValue(array)).toBe(
                    text
                );
            });

            it("`#getSize` should return -1", () => {
                expect(StringBufferFieldSubType.Instance.getSize()).toBe(-1);
            });
        });

        class MockArrayBufferFieldDefinition<
            TType extends BufferFieldSubType
        > extends BufferLikeFieldDefinition<TType, number> {
            public getSize(): number {
                return this.options;
            }
        }

        describe("BufferLikeFieldDefinition", () => {
            it("should work with `Uint8ArrayBufferFieldSubType`", () => {
                const size = 10;
                const definition = new MockArrayBufferFieldDefinition(
                    Uint8ArrayBufferFieldSubType.Instance,
                    size
                );

                const context = new MockDeserializationStream();
                const array = new Uint8Array(size);
                context.array = array;
                const struct = new StructValue({});

                const fieldValue = definition.deserialize(
                    StructDefaultOptions,
                    context,
                    struct
                );
                expect(context.readExactly).toBeCalledTimes(1);
                expect(context.readExactly).toBeCalledWith(size);
                expect(fieldValue).toHaveProperty("array", array);

                expect(fieldValue.get()).toBe(array);
            });

            it("should work when `#getSize` returns `0`", () => {
                const size = 0;
                const definition = new MockArrayBufferFieldDefinition(
                    Uint8ArrayBufferFieldSubType.Instance,
                    size
                );

                const context = new MockDeserializationStream();
                const buffer = new Uint8Array(size);
                context.array = buffer;
                const struct = new StructValue({});

                const fieldValue = definition.deserialize(
                    StructDefaultOptions,
                    context,
                    struct
                );
                expect(context.readExactly).toBeCalledTimes(0);
                expect(fieldValue["array"]).toBeInstanceOf(Uint8Array);
                expect(fieldValue["array"]).toHaveProperty("byteLength", 0);

                const value = fieldValue.get();
                expect(value).toBeInstanceOf(Uint8Array);
                expect(value).toHaveProperty("byteLength", 0);
            });
        });

        describe("ArrayBufferLikeFieldValue", () => {
            describe("#set", () => {
                it("should clear `array` field", () => {
                    const size = 0;
                    const definition = new MockArrayBufferFieldDefinition(
                        Uint8ArrayBufferFieldSubType.Instance,
                        size
                    );

                    const context = new MockDeserializationStream();
                    const array = new Uint8Array(size);
                    context.array = array;
                    const struct = new StructValue({});

                    const fieldValue = definition.deserialize(
                        StructDefaultOptions,
                        context,
                        struct
                    );

                    const newValue = new Uint8Array(20);
                    fieldValue.set(newValue);
                    expect(fieldValue.get()).toBe(newValue);
                    expect(fieldValue).toHaveProperty("array", undefined);
                });
            });

            describe("#serialize", () => {
                it("should be able to serialize with cached `array`", () => {
                    const size = 0;
                    const definition = new MockArrayBufferFieldDefinition(
                        Uint8ArrayBufferFieldSubType.Instance,
                        size
                    );

                    const context = new MockDeserializationStream();
                    const sourceArray = new Uint8Array(
                        Array.from({ length: size }, (_, i) => i)
                    );
                    const array = sourceArray;
                    context.array = array;
                    const struct = new StructValue({});

                    const fieldValue = definition.deserialize(
                        StructDefaultOptions,
                        context,
                        struct
                    );

                    const targetArray = new Uint8Array(size);
                    const targetView = new DataView(targetArray.buffer);
                    fieldValue.serialize(targetView, 0);

                    expect(targetArray).toEqual(sourceArray);
                });

                it("should be able to serialize a modified value", () => {
                    const size = 0;
                    const definition = new MockArrayBufferFieldDefinition(
                        Uint8ArrayBufferFieldSubType.Instance,
                        size
                    );

                    const context = new MockDeserializationStream();
                    const sourceArray = new Uint8Array(
                        Array.from({ length: size }, (_, i) => i)
                    );
                    const array = sourceArray;
                    context.array = array;
                    const struct = new StructValue({});

                    const fieldValue = definition.deserialize(
                        StructDefaultOptions,
                        context,
                        struct
                    );

                    fieldValue.set(sourceArray);

                    const targetArray = new Uint8Array(size);
                    const targetView = new DataView(targetArray.buffer);
                    fieldValue.serialize(targetView, 0);

                    expect(targetArray).toEqual(sourceArray);
                });
            });
        });
    });
});
