import assert from "node:assert";
import { describe, it } from "node:test";

import { getGlobalValue } from "./utils.js";

describe("global", () => {
    describe("utils", () => {
        describe("getGlobalValue", () => {
            it("should return global variable", () => {
                assert.strictEqual(
                    globalThis.AbortSignal,
                    getGlobalValue("AbortSignal"),
                );
            });
        });
    });
});
