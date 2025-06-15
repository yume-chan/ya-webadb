import * as assert from "node:assert";
import { describe, it } from "node:test";

import { Consumable } from "../consumable.js";

import { getValue, tryConsume } from "./utils.js";

describe("MaybeConsumable", () => {
    describe("getValue", () => {
        it("should return the original value if it's not Consumable", () => {
            const value = {};
            assert.strictEqual(getValue(value), value);
        });

        it("should return the inner value if it's Consumable", () => {
            const value = new Consumable({});
            assert.strictEqual(getValue(value), value.value);
        });

        it("should return undefined for undefined", () => {
            assert.strictEqual(getValue(undefined), undefined);
        });
    });

    describe("tryConsume", () => {
        it("should invoke the callback with the original value if it's not Consumable", () => {
            const value = {};
            const callback = (got: unknown) => {
                assert.strictEqual(got, value);
            };
            tryConsume(value, callback);
        });

        it("should invoke the callback with the inner value if it's Consumable", () => {
            const value = new Consumable({});
            const callback = (got: unknown) => {
                assert.strictEqual(got, value.value);
            };
            tryConsume(value, callback);
        });
    });
});
