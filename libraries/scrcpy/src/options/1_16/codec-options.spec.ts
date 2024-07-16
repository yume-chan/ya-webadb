import * as assert from "node:assert";
import { describe, it } from "node:test";

import { CodecOptions } from "./codec-options.js";

describe("CodecOptions", () => {
    it("should detect empty value", () => {
        assert.strictEqual(new CodecOptions({}).toOptionValue(), undefined);
    });
});
