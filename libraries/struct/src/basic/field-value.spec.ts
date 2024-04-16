/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "@jest/globals";

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
                serialize(
                    dataView: DataView,
                    array: Uint8Array,
                    offset: number,
                ): void {
                    void dataView;
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
            expect(fieldValue).toHaveProperty("definition", definition);
            expect(fieldValue).toHaveProperty("options", options);
            expect(fieldValue).toHaveProperty("struct", struct);
            expect(fieldValue.get()).toBe(value);
        });
    });

    describe("#getSize", () => {
        it("should return same value as definition's", () => {
            class MockFieldDefinition extends StructFieldDefinition {
                getSize(): number {
                    return 42;
                }
                create(
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
                serialize(
                    dataView: DataView,
                    array: Uint8Array,
                    offset: number,
                ): void {
                    void dataView;
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
            expect(fieldValue.getSize()).toBe(42);
        });
    });

    describe("#set", () => {
        it("should update its internal value", () => {
            class MockStructFieldValue extends StructFieldValue<any> {
                serialize(
                    dataView: DataView,
                    array: Uint8Array,
                    offset: number,
                ): void {
                    void dataView;
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
            expect(fieldValue.get()).toBe(1);

            fieldValue.set(2);
            expect(fieldValue.get()).toBe(2);
        });
    });
});
