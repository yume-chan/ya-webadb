/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as assert from "node:assert";
import { describe, it, mock } from "node:test";

import {
    StructDefaultOptions,
    StructFieldValue,
    StructValue,
} from "../../basic/index.js";

import {
    BufferFieldConverter,
    EMPTY_UINT8_ARRAY,
    Uint8ArrayBufferFieldConverter,
} from "./base.js";
import type { VariableLengthBufferLikeFieldOptions } from "./variable-length.js";
import {
    VariableLengthBufferLikeFieldDefinition,
    VariableLengthBufferLikeFieldLengthValue,
    VariableLengthBufferLikeStructFieldValue,
} from "./variable-length.js";

class MockLengthFieldValue extends StructFieldValue<any> {
    constructor() {
        super({} as any, {} as any, {} as any, {});
    }

    override value: string | number = 0;

    override get = mock.fn((): string | number => this.value);

    size = 0;

    override getSize = mock.fn((): number => this.size);

    override set = mock.fn((value: string | number) => {
        void value;
    });

    serialize = mock.fn((array: Uint8Array, offset: number): void => {
        void array;
        void offset;
    });
}

describe("Types", () => {
    describe("VariableLengthBufferLikeFieldLengthValue", () => {
        class MockBufferLikeFieldValue extends StructFieldValue<
            VariableLengthBufferLikeFieldDefinition<
                any,
                VariableLengthBufferLikeFieldOptions<any, any>,
                any
            >
        > {
            constructor() {
                super({ options: {} } as any, {} as any, {} as any, {});
            }

            size = 0;

            override getSize = mock.fn(() => this.size);

            override serialize(array: Uint8Array, offset: number): void {
                void array;
                void offset;
                throw new Error("Method not implemented.");
            }
        }

        describe("#getSize", () => {
            it("should return size of its original field value", () => {
                const mockOriginalFieldValue = new MockLengthFieldValue();
                const mockBufferFieldValue = new MockBufferLikeFieldValue();
                const lengthFieldValue =
                    new VariableLengthBufferLikeFieldLengthValue(
                        mockOriginalFieldValue,
                        mockBufferFieldValue,
                    );

                mockOriginalFieldValue.size = 0;
                assert.strictEqual(lengthFieldValue.getSize(), 0);
                assert.strictEqual(
                    mockOriginalFieldValue.getSize.mock.callCount(),
                    1,
                );

                mockOriginalFieldValue.getSize.mock.resetCalls();
                mockOriginalFieldValue.size = 100;
                assert.strictEqual(lengthFieldValue.getSize(), 100);
                assert.strictEqual(
                    mockOriginalFieldValue.getSize.mock.callCount(),
                    1,
                );
            });
        });

        describe("#get", () => {
            it("should return size of its `bufferValue`", () => {
                const mockOriginalFieldValue = new MockLengthFieldValue();
                const mockBufferFieldValue = new MockBufferLikeFieldValue();
                const lengthFieldValue =
                    new VariableLengthBufferLikeFieldLengthValue(
                        mockOriginalFieldValue,
                        mockBufferFieldValue,
                    );

                mockOriginalFieldValue.value = 0;
                mockBufferFieldValue.size = 0;
                assert.strictEqual(lengthFieldValue.get(), 0);
                assert.strictEqual(
                    mockBufferFieldValue.getSize.mock.callCount(),
                    1,
                );
                assert.strictEqual(
                    mockOriginalFieldValue.get.mock.callCount(),
                    1,
                );

                mockBufferFieldValue.getSize.mock.resetCalls();
                mockOriginalFieldValue.get.mock.resetCalls();
                mockBufferFieldValue.size = 100;
                assert.strictEqual(lengthFieldValue.get(), 100);
                assert.strictEqual(
                    mockBufferFieldValue.getSize.mock.callCount(),
                    1,
                );
                assert.strictEqual(
                    mockOriginalFieldValue.get.mock.callCount(),
                    1,
                );
            });

            it("should return size of its `bufferValue` as string", () => {
                const mockOriginalFieldValue = new MockLengthFieldValue();
                mockOriginalFieldValue.value = "0";
                const mockBufferFieldValue = new MockBufferLikeFieldValue();
                const lengthFieldValue =
                    new VariableLengthBufferLikeFieldLengthValue(
                        mockOriginalFieldValue,
                        mockBufferFieldValue,
                    );

                mockBufferFieldValue.size = 0;
                assert.strictEqual(lengthFieldValue.get(), "0");
                assert.strictEqual(
                    mockBufferFieldValue.getSize.mock.callCount(),
                    1,
                );
                assert.strictEqual(
                    mockOriginalFieldValue.get.mock.callCount(),
                    1,
                );

                mockBufferFieldValue.getSize.mock.resetCalls();
                mockOriginalFieldValue.get.mock.resetCalls();
                mockBufferFieldValue.size = 100;
                assert.strictEqual(lengthFieldValue.get(), "100");
                assert.strictEqual(
                    mockBufferFieldValue.getSize.mock.callCount(),
                    1,
                );
                assert.strictEqual(
                    mockOriginalFieldValue.get.mock.callCount(),
                    1,
                );
            });
        });

        describe("#set", () => {
            it("should does nothing", () => {
                const mockOriginalFieldValue = new MockLengthFieldValue();
                const mockBufferFieldValue = new MockBufferLikeFieldValue();
                const lengthFieldValue =
                    new VariableLengthBufferLikeFieldLengthValue(
                        mockOriginalFieldValue,
                        mockBufferFieldValue,
                    );

                mockOriginalFieldValue.value = 0;
                mockBufferFieldValue.size = 0;
                assert.strictEqual(lengthFieldValue.get(), 0);

                (lengthFieldValue as StructFieldValue<any>).set(100);
                assert.strictEqual(lengthFieldValue.get(), 0);
            });
        });

        describe("#serialize", () => {
            it("should call `serialize` of its `originalValue`", () => {
                const mockOriginalFieldValue = new MockLengthFieldValue();
                const mockBufferFieldValue = new MockBufferLikeFieldValue();
                const lengthFieldValue =
                    new VariableLengthBufferLikeFieldLengthValue(
                        mockOriginalFieldValue,
                        mockBufferFieldValue,
                    );

                const array = {} as any;
                const offset = {} as any;

                mockOriginalFieldValue.value = 10;
                mockBufferFieldValue.size = 0;
                lengthFieldValue.serialize(array, offset);
                assert.strictEqual(
                    mockOriginalFieldValue.get.mock.callCount(),
                    1,
                );
                assert.strictEqual(
                    mockOriginalFieldValue.get.mock.calls[0]?.result,
                    10,
                );
                assert.strictEqual(
                    mockOriginalFieldValue.set.mock.callCount(),
                    1,
                );
                assert.deepStrictEqual(
                    mockOriginalFieldValue.set.mock.calls[0]?.arguments,
                    [0],
                );
                assert.strictEqual(
                    mockOriginalFieldValue.serialize.mock.callCount(),
                    1,
                );
                assert.deepStrictEqual(
                    mockOriginalFieldValue.serialize.mock.calls[0]?.arguments,
                    [array, offset],
                );

                mockOriginalFieldValue.set.mock.resetCalls();
                mockOriginalFieldValue.serialize.mock.resetCalls();
                mockBufferFieldValue.size = 100;
                lengthFieldValue.serialize(array, offset);
                assert.strictEqual(
                    mockOriginalFieldValue.set.mock.callCount(),
                    1,
                );
                assert.deepStrictEqual(
                    mockOriginalFieldValue.set.mock.calls[0]?.arguments,
                    [100],
                );
                assert.strictEqual(
                    mockOriginalFieldValue.serialize.mock.callCount(),
                    1,
                );
                assert.deepStrictEqual(
                    mockOriginalFieldValue.serialize.mock.calls[0]?.arguments,
                    [array, offset],
                );
            });

            it("should stringify its length if `originalValue` is a string", () => {
                const mockOriginalFieldValue = new MockLengthFieldValue();
                const mockBufferFieldValue = new MockBufferLikeFieldValue();
                const lengthFieldValue =
                    new VariableLengthBufferLikeFieldLengthValue(
                        mockOriginalFieldValue,
                        mockBufferFieldValue,
                    );

                const array = {} as any;
                const offset = {} as any;

                mockOriginalFieldValue.value = "10";
                mockBufferFieldValue.size = 0;
                lengthFieldValue.serialize(array, offset);
                assert.strictEqual(
                    mockOriginalFieldValue.get.mock.callCount(),
                    1,
                );
                assert.strictEqual(
                    mockOriginalFieldValue.get.mock.calls[0]?.result,
                    "10",
                );
                assert.strictEqual(
                    mockOriginalFieldValue.set.mock.callCount(),
                    1,
                );
                assert.deepStrictEqual(
                    mockOriginalFieldValue.set.mock.calls[0]?.arguments,
                    ["0"],
                );
                assert.strictEqual(
                    mockOriginalFieldValue.serialize.mock.callCount(),
                    1,
                );
                assert.deepStrictEqual(
                    mockOriginalFieldValue.serialize.mock.calls[0]?.arguments,
                    [array, offset],
                );

                mockOriginalFieldValue.set.mock.resetCalls();
                mockOriginalFieldValue.serialize.mock.resetCalls();
                mockBufferFieldValue.size = 100;
                lengthFieldValue.serialize(array, offset);
                assert.strictEqual(
                    mockOriginalFieldValue.set.mock.callCount(),
                    1,
                );
                assert.deepStrictEqual(
                    mockOriginalFieldValue.set.mock.calls[0]?.arguments,
                    ["100"],
                );
                assert.strictEqual(
                    mockOriginalFieldValue.serialize.mock.callCount(),
                    1,
                );
                assert.deepStrictEqual(
                    mockOriginalFieldValue.serialize.mock.calls[0]?.arguments,
                    [array, offset],
                );
            });

            it("should stringify its length in specified radix if `originalValue` is a string", () => {
                const mockOriginalFieldValue = new MockLengthFieldValue();
                const mockBufferFieldValue = new MockBufferLikeFieldValue();
                const lengthFieldValue =
                    new VariableLengthBufferLikeFieldLengthValue(
                        mockOriginalFieldValue,
                        mockBufferFieldValue,
                    );

                const radix = 16;
                mockBufferFieldValue.definition.options.lengthFieldRadix =
                    radix;

                const array = {} as any;
                const offset = {} as any;

                mockOriginalFieldValue.value = "10";
                mockBufferFieldValue.size = 0;
                lengthFieldValue.serialize(array, offset);
                assert.strictEqual(
                    mockOriginalFieldValue.get.mock.callCount(),
                    1,
                );
                assert.strictEqual(
                    mockOriginalFieldValue.get.mock.calls[0]?.result,
                    "10",
                );
                assert.strictEqual(
                    mockOriginalFieldValue.set.mock.callCount(),
                    1,
                );
                assert.deepStrictEqual(
                    mockOriginalFieldValue.set.mock.calls[0]?.arguments,
                    ["0"],
                );
                assert.strictEqual(
                    mockOriginalFieldValue.serialize.mock.callCount(),
                    1,
                );
                assert.deepStrictEqual(
                    mockOriginalFieldValue.serialize.mock.calls[0]?.arguments,
                    [array, offset],
                );

                mockOriginalFieldValue.set.mock.resetCalls();
                mockOriginalFieldValue.serialize.mock.resetCalls();
                mockBufferFieldValue.size = 100;
                lengthFieldValue.serialize(array, offset);
                assert.strictEqual(
                    mockOriginalFieldValue.set.mock.callCount(),
                    1,
                );
                assert.deepStrictEqual(
                    mockOriginalFieldValue.set.mock.calls[0]?.arguments,
                    [(100).toString(radix)],
                );
                assert.strictEqual(
                    mockOriginalFieldValue.serialize.mock.callCount(),
                    1,
                );
                assert.deepStrictEqual(
                    mockOriginalFieldValue.serialize.mock.calls[0]?.arguments,
                    [array, offset],
                );
            });
        });
    });

    describe("VariableLengthBufferLikeStructFieldValue", () => {
        describe(".constructor", () => {
            it("should forward parameters", () => {
                const struct = new StructValue({});

                const lengthField = "foo";
                const originalLengthFieldValue = new MockLengthFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const bufferFieldDefinition =
                    new VariableLengthBufferLikeFieldDefinition(
                        Uint8ArrayBufferFieldConverter.Instance,
                        { lengthField },
                    );

                const value = EMPTY_UINT8_ARRAY;

                const bufferFieldValue =
                    new VariableLengthBufferLikeStructFieldValue(
                        bufferFieldDefinition,
                        StructDefaultOptions,
                        struct,
                        value,
                    );

                assert.strictEqual(
                    bufferFieldValue.definition,
                    bufferFieldDefinition,
                );
                assert.strictEqual(
                    bufferFieldValue.options,
                    StructDefaultOptions,
                );
                assert.strictEqual(bufferFieldValue.struct, struct);
                assert.deepStrictEqual(bufferFieldValue["value"], value);
                assert.strictEqual(bufferFieldValue["array"], undefined);
                assert.strictEqual(bufferFieldValue["length"], undefined);
            });

            it("should accept initial `array`", () => {
                const struct = new StructValue({});

                const lengthField = "foo";
                const originalLengthFieldValue = new MockLengthFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const bufferFieldDefinition =
                    new VariableLengthBufferLikeFieldDefinition(
                        Uint8ArrayBufferFieldConverter.Instance,
                        { lengthField },
                    );

                const value = new Uint8Array(100);

                const bufferFieldValue =
                    new VariableLengthBufferLikeStructFieldValue(
                        bufferFieldDefinition,
                        StructDefaultOptions,
                        struct,
                        value,
                        value,
                    );

                assert.strictEqual(
                    bufferFieldValue.definition,
                    bufferFieldDefinition,
                );
                assert.strictEqual(
                    bufferFieldValue.options,
                    StructDefaultOptions,
                );
                assert.strictEqual(bufferFieldValue.struct, struct);
                assert.deepStrictEqual(bufferFieldValue["value"], value);
                assert.deepStrictEqual(bufferFieldValue["array"], value);
                assert.strictEqual(bufferFieldValue["length"], value.length);
            });

            it("should replace `lengthField` on `struct`", () => {
                const struct = new StructValue({});

                const lengthField = "foo";
                const originalLengthFieldValue = new MockLengthFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const bufferFieldDefinition =
                    new VariableLengthBufferLikeFieldDefinition(
                        Uint8ArrayBufferFieldConverter.Instance,
                        { lengthField },
                    );

                const value = EMPTY_UINT8_ARRAY;

                const bufferFieldValue =
                    new VariableLengthBufferLikeStructFieldValue(
                        bufferFieldDefinition,
                        StructDefaultOptions,
                        struct,
                        value,
                    );

                assert.ok(
                    bufferFieldValue["lengthFieldValue"] instanceof
                        StructFieldValue,
                );
                assert.strictEqual(
                    struct.fieldValues[lengthField],
                    bufferFieldValue["lengthFieldValue"],
                );
            });
        });

        describe("#getSize", () => {
            class MockBufferFieldConverter extends BufferFieldConverter<Uint8Array> {
                override toBuffer = mock.fn((value: Uint8Array): Uint8Array => {
                    return value;
                });

                override toValue = mock.fn(
                    (arrayBuffer: Uint8Array): Uint8Array => {
                        return arrayBuffer;
                    },
                );

                size: number | undefined = 0;

                override getSize = mock.fn(
                    (value: Uint8Array): number | undefined => {
                        void value;
                        return this.size;
                    },
                );
            }

            it("should return cached size if exist", () => {
                const struct = new StructValue({});

                const lengthField = "foo";
                const originalLengthFieldValue = new MockLengthFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const bufferFieldConverter = new MockBufferFieldConverter();
                const bufferFieldDefinition =
                    new VariableLengthBufferLikeFieldDefinition(
                        bufferFieldConverter,
                        { lengthField },
                    );

                const value = new Uint8Array(100);

                const bufferFieldValue =
                    new VariableLengthBufferLikeStructFieldValue(
                        bufferFieldDefinition,
                        StructDefaultOptions,
                        struct,
                        value,
                        value,
                    );

                assert.strictEqual(bufferFieldValue.getSize(), 100);
                assert.strictEqual(
                    bufferFieldConverter.toValue.mock.callCount(),
                    0,
                );
                assert.strictEqual(
                    bufferFieldConverter.toBuffer.mock.callCount(),
                    0,
                );
                assert.strictEqual(
                    bufferFieldConverter.getSize.mock.callCount(),
                    0,
                );
            });

            it("should call `getSize` of its `converter`", () => {
                const struct = new StructValue({});

                const lengthField = "foo";
                const originalLengthFieldValue = new MockLengthFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const bufferFieldConverter = new MockBufferFieldConverter();
                const bufferFieldDefinition =
                    new VariableLengthBufferLikeFieldDefinition(
                        bufferFieldConverter,
                        { lengthField },
                    );

                const value = new Uint8Array(100);

                const bufferFieldValue =
                    new VariableLengthBufferLikeStructFieldValue(
                        bufferFieldDefinition,
                        StructDefaultOptions,
                        struct,
                        value,
                    );

                bufferFieldConverter.size = 100;
                assert.strictEqual(bufferFieldValue.getSize(), 100);
                assert.strictEqual(
                    bufferFieldConverter.toValue.mock.callCount(),
                    0,
                );
                assert.strictEqual(
                    bufferFieldConverter.toBuffer.mock.callCount(),
                    0,
                );
                assert.strictEqual(
                    bufferFieldConverter.getSize.mock.callCount(),
                    1,
                );
                assert.strictEqual(bufferFieldValue["array"], undefined);
                assert.strictEqual(bufferFieldValue["length"], 100);
            });

            it("should call `toBuffer` of its `converter` if it does not support `getSize`", () => {
                const struct = new StructValue({});

                const lengthField = "foo";
                const originalLengthFieldValue = new MockLengthFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const bufferFieldConverter = new MockBufferFieldConverter();
                const bufferFieldDefinition =
                    new VariableLengthBufferLikeFieldDefinition(
                        bufferFieldConverter,
                        { lengthField },
                    );

                const value = new Uint8Array(100);

                const bufferFieldValue =
                    new VariableLengthBufferLikeStructFieldValue(
                        bufferFieldDefinition,
                        StructDefaultOptions,
                        struct,
                        value,
                    );

                bufferFieldConverter.size = undefined;
                assert.strictEqual(bufferFieldValue.getSize(), 100);
                assert.strictEqual(
                    bufferFieldConverter.toValue.mock.callCount(),
                    0,
                );
                assert.strictEqual(
                    bufferFieldConverter.toBuffer.mock.callCount(),
                    1,
                );
                assert.strictEqual(
                    bufferFieldConverter.getSize.mock.callCount(),
                    1,
                );
                assert.strictEqual(bufferFieldValue["array"], value);
                assert.strictEqual(bufferFieldValue["length"], 100);
            });
        });

        describe("#set", () => {
            it("should call `BufferLikeFieldValue#set`", () => {
                const struct = new StructValue({});

                const lengthField = "foo";
                const originalLengthFieldValue = new MockLengthFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const bufferFieldDefinition =
                    new VariableLengthBufferLikeFieldDefinition(
                        Uint8ArrayBufferFieldConverter.Instance,
                        { lengthField },
                    );

                const value = new Uint8Array(100);

                const bufferFieldValue =
                    new VariableLengthBufferLikeStructFieldValue(
                        bufferFieldDefinition,
                        StructDefaultOptions,
                        struct,
                        value,
                        value,
                    );

                const newValue = new ArrayBuffer(100);
                bufferFieldValue.set(newValue);
                assert.strictEqual(bufferFieldValue.get(), newValue);
                assert.strictEqual(bufferFieldValue["array"], undefined);
            });

            it("should clear length", () => {
                const struct = new StructValue({});

                const lengthField = "foo";
                const originalLengthFieldValue = new MockLengthFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const bufferFieldDefinition =
                    new VariableLengthBufferLikeFieldDefinition(
                        Uint8ArrayBufferFieldConverter.Instance,
                        { lengthField },
                    );

                const value = new Uint8Array(100);

                const bufferFieldValue =
                    new VariableLengthBufferLikeStructFieldValue(
                        bufferFieldDefinition,
                        StructDefaultOptions,
                        struct,
                        value,
                        value,
                    );

                const newValue = new ArrayBuffer(100);
                bufferFieldValue.set(newValue);
                assert.strictEqual(bufferFieldValue["length"], undefined);
            });
        });
    });

    describe("VariableLengthBufferLikeFieldDefinition", () => {
        describe("#getSize", () => {
            it("should always return `0`", () => {
                const definition = new VariableLengthBufferLikeFieldDefinition(
                    Uint8ArrayBufferFieldConverter.Instance,
                    { lengthField: "foo" },
                );
                assert.strictEqual(definition.getSize(), 0);
            });
        });

        describe("#getDeserializeSize", () => {
            it("should return value of its `lengthField`", () => {
                const struct = new StructValue({});

                const lengthField = "foo";
                const originalLengthFieldValue = new MockLengthFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const definition = new VariableLengthBufferLikeFieldDefinition(
                    Uint8ArrayBufferFieldConverter.Instance,
                    { lengthField },
                );

                originalLengthFieldValue.value = 0;
                assert.strictEqual(definition["getDeserializeSize"](struct), 0);
                assert.strictEqual(
                    originalLengthFieldValue.get.mock.callCount(),
                    1,
                );

                originalLengthFieldValue.get.mock.resetCalls();
                originalLengthFieldValue.value = 100;
                assert.strictEqual(
                    definition["getDeserializeSize"](struct),
                    100,
                );
                assert.strictEqual(
                    originalLengthFieldValue.get.mock.callCount(),
                    1,
                );
            });

            it("should return value of its `lengthField` as number", () => {
                const struct = new StructValue({});

                const lengthField = "foo";
                const originalLengthFieldValue = new MockLengthFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const definition = new VariableLengthBufferLikeFieldDefinition(
                    Uint8ArrayBufferFieldConverter.Instance,
                    { lengthField },
                );

                originalLengthFieldValue.value = "0";
                assert.strictEqual(definition["getDeserializeSize"](struct), 0);
                assert.strictEqual(
                    originalLengthFieldValue.get.mock.callCount(),
                    1,
                );

                originalLengthFieldValue.get.mock.resetCalls();
                originalLengthFieldValue.value = "100";
                assert.strictEqual(
                    definition["getDeserializeSize"](struct),
                    100,
                );
                assert.strictEqual(
                    originalLengthFieldValue.get.mock.callCount(),
                    1,
                );
            });

            it("should return value of its `lengthField` as number with specified radix", () => {
                const struct = new StructValue({});

                const lengthField = "foo";
                const originalLengthFieldValue = new MockLengthFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const radix = 8;
                const definition = new VariableLengthBufferLikeFieldDefinition(
                    Uint8ArrayBufferFieldConverter.Instance,
                    { lengthField, lengthFieldRadix: radix },
                );

                originalLengthFieldValue.value = "0";
                assert.strictEqual(definition["getDeserializeSize"](struct), 0);
                assert.strictEqual(
                    originalLengthFieldValue.get.mock.callCount(),
                    1,
                );

                originalLengthFieldValue.get.mock.resetCalls();
                originalLengthFieldValue.value = "100";
                assert.strictEqual(
                    definition["getDeserializeSize"](struct),
                    Number.parseInt("100", radix),
                );
                assert.strictEqual(
                    originalLengthFieldValue.get.mock.callCount(),
                    1,
                );
            });
        });

        describe("#create", () => {
            it("should create a `VariableLengthBufferLikeStructFieldValue`", () => {
                const struct = new StructValue({});

                const lengthField = "foo";
                const originalLengthFieldValue = new MockLengthFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const definition = new VariableLengthBufferLikeFieldDefinition(
                    Uint8ArrayBufferFieldConverter.Instance,
                    { lengthField },
                );

                const value = new Uint8Array(100);
                const bufferFieldValue = definition.create(
                    StructDefaultOptions,
                    struct,
                    value,
                );

                assert.strictEqual(bufferFieldValue.definition, definition);
                assert.strictEqual(
                    bufferFieldValue.options,
                    StructDefaultOptions,
                );
                assert.strictEqual(bufferFieldValue.struct, struct);
                assert.strictEqual(bufferFieldValue["value"], value);
                assert.strictEqual(bufferFieldValue["array"], undefined);
                assert.strictEqual(bufferFieldValue["length"], undefined);
            });

            it("should create a `VariableLengthBufferLikeStructFieldValue` with `arrayBuffer`", () => {
                const struct = new StructValue({});

                const lengthField = "foo";
                const originalLengthFieldValue = new MockLengthFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const definition = new VariableLengthBufferLikeFieldDefinition(
                    Uint8ArrayBufferFieldConverter.Instance,
                    { lengthField },
                );

                const value = new Uint8Array(100);
                const bufferFieldValue = definition.create(
                    StructDefaultOptions,
                    struct,
                    value,
                    value,
                );

                assert.strictEqual(bufferFieldValue.definition, definition);
                assert.strictEqual(
                    bufferFieldValue.options,
                    StructDefaultOptions,
                );
                assert.strictEqual(bufferFieldValue.struct, struct);
                assert.strictEqual(bufferFieldValue["value"], value);
                assert.strictEqual(bufferFieldValue["array"], value);
                assert.strictEqual(bufferFieldValue["length"], 100);
            });
        });
    });
});
