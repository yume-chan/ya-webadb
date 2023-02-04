import { describe, expect, it } from "@jest/globals";

import { CodecOptions } from "./codec-options.js";

describe("CodecOptions", () => {
    it("should detect empty value", () => {
        expect(new CodecOptions({}).toOptionValue()).toBeUndefined();
    });
});
