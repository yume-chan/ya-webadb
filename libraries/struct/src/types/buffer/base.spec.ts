import * as assert from "node:assert";
import { describe, it, mock } from "node:test";

import type { ExactReadable } from "../../basic/index.js";
import { StructDefaultOptions, StructValue } from "../../basic/index.js";

import type { BufferFieldConverter } from "./base.js";
import {
    BufferLikeFieldDefinition,
    EMPTY_UINT8_ARRAY,
    StringBufferFieldConverter,
    Uint8ArrayBufferFieldConverter,
} from "./base.js";

class MockDeserializationStream implements ExactReadable {
    array = EMPTY_UINT8_ARRAY;

    position = 0;

    readExactly = mock.fn(() => this.array);
}

describe("Types", () => {
    describe("Buffer", () => {
        describe("Uint8ArrayBufferFieldSubType", () => {
            it("should have a static instance", () => {
                assert.ok(
                    Uint8ArrayBufferFieldConverter.Instance instanceof
                        Uint8ArrayBufferFieldConverter,
                );
            });

            it("`#toBuffer` should return the same `Uint8Array`", () => {
                const array = new Uint8Array(10);
                assert.strictEqual(
                    Uint8ArrayBufferFieldConverter.Instance.toBuffer(array),
                    array,
                );
            });

            it("`#fromBuffer` should return the same `Uint8Array`", () => {
                const buffer = new Uint8Array(10);
                assert.strictEqual(
                    Uint8ArrayBufferFieldConverter.Instance.toValue(buffer),
                    buffer,
                );
            });

            it("`#getSize` should return the `byteLength` of the `Uint8Array`", () => {
                const array = new Uint8Array(10);
                assert.strictEqual(
                    Uint8ArrayBufferFieldConverter.Instance.getSize(array),
                    10,
                );
            });
        });

        describe("StringBufferFieldSubType", () => {
            it("should have a static instance", () => {
                assert.ok(
                    StringBufferFieldConverter.Instance instanceof
                        StringBufferFieldConverter,
                );
            });

            it("`#toBuffer` should return the decoded string", () => {
                const text = "foo";
                const array = new Uint8Array(Buffer.from(text, "utf-8"));
                assert.deepStrictEqual(
                    StringBufferFieldConverter.Instance.toBuffer(text),
                    array,
                );
            });

            it("`#fromBuffer` should return the encoded ArrayBuffer", () => {
                const text = "foo";
                const array = new Uint8Array(Buffer.from(text, "utf-8"));
                assert.strictEqual(
                    StringBufferFieldConverter.Instance.toValue(array),
                    text,
                );
            });

            it("`#getSize` should return -1", () => {
                assert.strictEqual(
                    StringBufferFieldConverter.Instance.getSize(),
                    undefined,
                );
            });
        });

        class MockArrayBufferFieldDefinition<
            TType extends BufferFieldConverter,
        > extends BufferLikeFieldDefinition<TType, number> {
            getSize(): number {
                return this.options;
            }
        }

        describe("BufferLikeFieldDefinition", () => {
            it("should work with `Uint8ArrayBufferFieldSubType`", () => {
                const size = 10;
                const definition = new MockArrayBufferFieldDefinition(
                    Uint8ArrayBufferFieldConverter.Instance,
                    size,
                );

                const context = new MockDeserializationStream();
                const array = new Uint8Array(size);
                context.array = array;
                const struct = new StructValue({});

                const fieldValue = definition.deserialize(
                    StructDefaultOptions,
                    context,
                    struct,
                );
                assert.strictEqual(context.readExactly.mock.callCount(), 1);
                assert.deepStrictEqual(
                    context.readExactly.mock.calls[0]?.arguments,
                    [size],
                );
                assert.strictEqual(fieldValue["array"], array);

                assert.strictEqual(fieldValue.get(), array);
            });

            it("should work when `#getSize` returns `0`", () => {
                const size = 0;
                const definition = new MockArrayBufferFieldDefinition(
                    Uint8ArrayBufferFieldConverter.Instance,
                    size,
                );

                const context = new MockDeserializationStream();
                const buffer = new Uint8Array(size);
                context.array = buffer;
                const struct = new StructValue({});

                const fieldValue = definition.deserialize(
                    StructDefaultOptions,
                    context,
                    struct,
                );
                assert.strictEqual(context.readExactly.mock.callCount(), 0);
                assert.ok(fieldValue["array"] instanceof Uint8Array);
                assert.strictEqual(fieldValue["array"].byteLength, 0);

                const value = fieldValue.get();
                assert.ok(value instanceof Uint8Array);
                assert.strictEqual(value.byteLength, 0);
            });
        });

        describe("ArrayBufferLikeFieldValue", () => {
            describe("#set", () => {
                it("should clear `array` field", () => {
                    const size = 0;
                    const definition = new MockArrayBufferFieldDefinition(
                        Uint8ArrayBufferFieldConverter.Instance,
                        size,
                    );

                    const context = new MockDeserializationStream();
                    const array = new Uint8Array(size);
                    context.array = array;
                    const struct = new StructValue({});

                    const fieldValue = definition.deserialize(
                        StructDefaultOptions,
                        context,
                        struct,
                    );

                    const newValue = new Uint8Array(20);
                    fieldValue.set(newValue);
                    assert.deepStrictEqual(fieldValue.get(), newValue);
                    assert.strictEqual(fieldValue["array"], undefined);
                });
            });

            describe("#serialize", () => {
                it("should be able to serialize with cached `array`", () => {
                    const size = 0;
                    const definition = new MockArrayBufferFieldDefinition(
                        Uint8ArrayBufferFieldConverter.Instance,
                        size,
                    );

                    const context = new MockDeserializationStream();
                    const sourceArray = new Uint8Array(
                        Array.from({ length: size }, (_, i) => i),
                    );
                    const array = sourceArray;
                    context.array = array;
                    const struct = new StructValue({});

                    const fieldValue = definition.deserialize(
                        StructDefaultOptions,
                        context,
                        struct,
                    );

                    const targetArray = new Uint8Array(size);
                    fieldValue.serialize(targetArray, 0);

                    assert.deepStrictEqual(targetArray, sourceArray);
                });

                it("should be able to serialize a modified value", () => {
                    const size = 0;
                    const definition = new MockArrayBufferFieldDefinition(
                        Uint8ArrayBufferFieldConverter.Instance,
                        size,
                    );

                    const context = new MockDeserializationStream();
                    const sourceArray = new Uint8Array(
                        Array.from({ length: size }, (_, i) => i),
                    );
                    const array = sourceArray;
                    context.array = array;
                    const struct = new StructValue({});

                    const fieldValue = definition.deserialize(
                        StructDefaultOptions,
                        context,
                        struct,
                    );

                    fieldValue.set(sourceArray);

                    const targetArray = new Uint8Array(size);
                    fieldValue.serialize(targetArray, 0);

                    assert.deepStrictEqual(targetArray, sourceArray);
                });
            });
        });
    });
});
