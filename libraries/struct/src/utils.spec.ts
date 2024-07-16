import * as assert from "node:assert";
import { describe, it } from "node:test";

import { placeholder } from "./utils.js";

describe("placeholder", () => {
    it("should return `undefined`", () => {
        assert.ok(placeholder);
    });
});
