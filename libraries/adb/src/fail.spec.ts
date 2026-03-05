import assert from "node:assert";
import { describe, it } from "node:test";

describe("failed test", () => {
    it("will fail", () => {
        assert.deepStrictEqual({ foo: 1 }, { bar: true });
    });
});
