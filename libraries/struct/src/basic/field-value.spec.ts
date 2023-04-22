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
            class MockStructFieldValue extends StructFieldValue {
                public serialize(dataView: DataView, offset: number): void {
                    void dataView;
                    void offset;
                    throw new Error("Method not implemented.");
                }
            }

            const definition = {} as any;
            const options = {} as any;
            const struct = {} as any;
            const value = {} as any;

            const fieldValue = new MockStructFieldValue(
                definition,
                options,
                struct,
                value
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
                public getSize(): number {
                    return 42;
                }
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

            class MockStructFieldValue extends StructFieldValue {
                public serialize(dataView: DataView, offset: number): void {
                    void dataView;
                    void offset;
                    throw new Error("Method not implemented.");
                }
            }

            const fieldDefinition = new MockFieldDefinition();
            const fieldValue = new MockStructFieldValue(
                fieldDefinition,
                undefined as any,
                undefined as any,
                undefined as any
            );
            expect(fieldValue.getSize()).toBe(42);
        });
    });

    describe("#set", () => {
        it("should update its internal value", () => {
            class MockStructFieldValue extends StructFieldValue {
                public serialize(dataView: DataView, offset: number): void {
                    void dataView;
                    void offset;
                    throw new Error("Method not implemented.");
                }
            }

            const fieldValue = new MockStructFieldValue(
                undefined as any,
                undefined as any,
                undefined as any,
                undefined as any
            );
            fieldValue.set(1);
            expect(fieldValue.get()).toBe(1);

            fieldValue.set(2);
            expect(fieldValue.get()).toBe(2);
        });
    });
});
