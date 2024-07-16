import * as assert from "node:assert";
import { describe, it } from "node:test";

import { StructDefaultOptions } from "./options.js";

describe("StructDefaultOptions", () => {
    describe(".littleEndian", () => {
        it("should be `false`", () => {
            assert.strictEqual(StructDefaultOptions.littleEndian, false);
        });
    });
});
