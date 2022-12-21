import { describe, expect, it, jest } from "@jest/globals";

import { StructValue } from "./struct-value.js";

describe("StructValue", () => {
    describe(".constructor", () => {
        it("should create `fieldValues` and `value`", () => {
            const foo = new StructValue({});
            const bar = new StructValue({});

            expect(foo).toHaveProperty("fieldValues", {});
            expect(foo).toHaveProperty("value", {});
            expect(bar).toHaveProperty("fieldValues", {});
            expect(bar).toHaveProperty("value", {});
            expect(foo.fieldValues).not.toBe(bar.fieldValues);
            expect(foo.value).not.toBe(bar.fieldValues);
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
            } as any;
            object.set(foo, fooValue);

            const bar = "bar";
            const barValue = {
                get() {
                    return "foo";
                },
            } as any;
            object.set(bar, barValue);

            expect(object.fieldValues[foo]).toBe(fooValue);
            expect(object.fieldValues[bar]).toBe(barValue);
        });

        it("should define a property for `key`", () => {
            const object = new StructValue({});

            const foo = "foo";
            const fooGetter = jest.fn(() => 42);
            const fooSetter = jest.fn((value: number) => {
                void value;
            });
            const fooValue = { get: fooGetter, set: fooSetter } as any;
            object.set(foo, fooValue);

            const bar = "bar";
            const barGetter = jest.fn(() => true);
            const barSetter = jest.fn((value: number) => {
                void value;
            });
            const barValue = { get: barGetter, set: barSetter } as any;
            object.set(bar, barValue);

            expect(object.value).toHaveProperty(foo, 42);
            expect(fooGetter).toBeCalledTimes(1);
            expect(barGetter).toBeCalledTimes(1);

            object.value[foo] = 100;
            expect(fooSetter).toBeCalledTimes(0);
            expect(barSetter).toBeCalledTimes(0);
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
            } as any;
            object.set(foo, fooValue);

            expect(object.get(foo)).toBe(fooValue);
        });
    });
});
