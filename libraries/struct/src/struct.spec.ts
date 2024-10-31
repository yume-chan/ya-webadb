import * as assert from "node:assert";
import { describe, it } from "node:test";

import { u8 } from "./number.js";
import { Struct } from "./struct.js";

describe("Struct", () => {
    it("serialize", () => {
        const A = new Struct({ id: u8 }, { littleEndian: true });
        assert.deepStrictEqual(A.serialize({ id: 10 }), new Uint8Array([10]));
    });
});
