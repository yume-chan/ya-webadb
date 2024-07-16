import * as assert from "node:assert";
import { describe, it } from "node:test";

import Struct from "./index.js";

describe("Struct", () => {
    describe("Index", () => {
        it("should export default Struct", () => {
            assert.ok(Struct);
        });
    });
});
