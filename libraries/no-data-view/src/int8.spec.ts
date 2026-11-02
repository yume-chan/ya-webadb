import * as assert from "node:assert";
import { describe, it } from "node:test";

import { getInt8 } from "./int8.js";

describe("getInt8", () => {
    it("should work for minimal value", () => {
        const array = new Uint8Array([0x80]);
        assert.strictEqual(
            getInt8(array, 0),
            new DataView(array.buffer).getInt8(0),
        );
    });

    it("should work for maximal value", () => {
        const array = new Uint8Array([0x7f]);
        assert.strictEqual(
            getInt8(array, 0),
            new DataView(array.buffer).getInt8(0),
        );
    });

    it("should work for middle value", () => {
        const array = new Uint8Array([0]);
        assert.strictEqual(
            getInt8(array, 0),
            new DataView(array.buffer).getInt8(0),
        );
    });
});
