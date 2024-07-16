import * as assert from "node:assert";
import { describe, it, mock } from "node:test";

import type { StructFieldDefinition } from "./definition.js";
import type { StructFieldValue } from "./field-value.js";
import { StructValue } from "./struct-value.js";

describe("StructValue", () => {
    describe(".constructor", () => {
        it("should create `fieldValues` and `value`", () => {
            const foo = new StructValue({});
            const bar = new StructValue({});

            assert.deepStrictEqual(foo.fieldValues, {});
            assert.deepEqual(foo.value, {});
            assert.deepStrictEqual(bar.fieldValues, {});
            assert.deepEqual(bar.value, {});
            assert.notStrictEqual(foo.fieldValues, bar.fieldValues);
            assert.notStrictEqual(foo.value, bar.fieldValues);
        });
    });

    describe("#set", () => {
        it("should save the `StructFieldValue`", () => {
            const object = new StructValue({});

            const foo = "foo";
            const fooValue = {
                get() {
                    return 42;
                },
            } as StructFieldValue<
                StructFieldDefinition<unknown, unknown, PropertyKey>
            >;
            object.set(foo, fooValue);

            const bar = "bar";
            const barValue = {
                get() {
                    return "foo";
                },
            } as StructFieldValue<
                StructFieldDefinition<unknown, unknown, PropertyKey>
            >;
            object.set(bar, barValue);

            assert.strictEqual(object.fieldValues[foo], fooValue);
            assert.strictEqual(object.fieldValues[bar], barValue);
        });

        it("should define a property for `key`", () => {
            const object = new StructValue({});

            const foo = "foo";
            const fooGetter = mock.fn(() => 42);
            const fooSetter = mock.fn((value: number) => {
                void value;
            });
            const fooValue = {
                get: fooGetter,
                set: fooSetter,
            } as unknown as StructFieldValue<
                StructFieldDefinition<unknown, unknown, PropertyKey>
            >;
            object.set(foo, fooValue);

            const bar = "bar";
            const barGetter = mock.fn(() => true);
            const barSetter = mock.fn((value: boolean) => {
                void value;
            });
            const barValue = {
                get: barGetter,
                set: barSetter,
            } as unknown as StructFieldValue<
                StructFieldDefinition<unknown, unknown, PropertyKey>
            >;
            object.set(bar, barValue);

            assert.strictEqual(object.value[foo], 42);
            assert.strictEqual(fooGetter.mock.callCount(), 1);
            assert.strictEqual(barGetter.mock.callCount(), 1);

            object.value[foo] = 100;
            assert.strictEqual(fooSetter.mock.callCount(), 0);
            assert.strictEqual(barSetter.mock.callCount(), 0);
        });
    });

    describe("#get", () => {
        it("should return previously set `StructFieldValue`", () => {
            const object = new StructValue({});

            const foo = "foo";
            const fooValue = {
                get() {
                    return "foo";
                },
            } as StructFieldValue<
                StructFieldDefinition<unknown, unknown, PropertyKey>
            >;
            object.set(foo, fooValue);

            assert.strictEqual(object.get(foo), fooValue);
        });
    });
});
