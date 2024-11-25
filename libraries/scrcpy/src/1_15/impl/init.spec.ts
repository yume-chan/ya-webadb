import * as assert from "node:assert";
import { describe, it } from "node:test";

import { CodecOptions } from "./init.js";

describe("CodecOptions", () => {
    it("should convert empty value to `undefined`", () => {
        assert.strictEqual(new CodecOptions({}).toOptionValue(), undefined);
    });

    it("should serialize unknown options as integers", () => {
        assert.strictEqual(
            new CodecOptions({ profile: 42 }).toOptionValue(),
            "profile=42",
        );
    });
});
