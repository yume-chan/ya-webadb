/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from "node:assert";
import { describe, it } from "node:test";

import type { ValueOrPromise } from "../utils.js";

import { StructFieldDefinition } from "./definition.js";
import { StructFieldValue } from "./field-value.js";
import type { StructOptions } from "./options.js";
import type { AsyncExactReadable, ExactReadable } from "./stream.js";
import type { StructValue } from "./struct-value.js";

describe("StructFieldValue", () => {
    describe(".constructor", () => {
        it("should save parameters", () => {
            class MockStructFieldValue extends StructFieldValue<never> {
                override serialize(array: Uint8Array, offset: number): void {
                    void array;
                    void offset;
                    throw new Error("Method not implemented.");
                }
            }

            const definition = {};
            const options = {};
            const struct = {};
            const value = {};

            const fieldValue = new MockStructFieldValue(
                definition as never,
                options as never,
                struct as never,
                value as never,
            );
            assert.strictEqual(fieldValue.definition, definition);
            assert.strictEqual(fieldValue.options, options);
            assert.strictEqual(fieldValue.struct, struct);
            assert.strictEqual(fieldValue.get(), value);
        });
    });

    describe("#getSize", () => {
        it("should return same value as definition's", () => {
            class MockFieldDefinition extends StructFieldDefinition {
                override getSize(): number {
                    return 42;
                }
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

            class MockStructFieldValue extends StructFieldValue<any> {
                override serialize(array: Uint8Array, offset: number): void {
                    void array;
                    void offset;
                    throw new Error("Method not implemented.");
                }
            }

            const fieldDefinition = new MockFieldDefinition();
            const fieldValue = new MockStructFieldValue(
                fieldDefinition,
                undefined as never,
                undefined as never,
                undefined as never,
            );
            assert.strictEqual(fieldValue.getSize(), 42);
        });
    });

    describe("#set", () => {
        it("should update its internal value", () => {
            class MockStructFieldValue extends StructFieldValue<any> {
                override serialize(array: Uint8Array, offset: number): void {
                    void array;
                    void offset;
                    throw new Error("Method not implemented.");
                }
            }

            const fieldValue = new MockStructFieldValue(
                undefined as never,
                undefined as never,
                undefined as never,
                undefined as never,
            );
            fieldValue.set(1);
            assert.strictEqual(fieldValue.get(), 1);

            fieldValue.set(2);
            assert.strictEqual(fieldValue.get(), 2);
        });
    });
});
