import { describe, expect, it } from "@jest/globals";

import { CodecOptions } from "./codec-options.js";

describe("CodecOptions", () => {
    it("ignore empty options", () => {
        expect(new CodecOptions({}).toOptionValue()).toBeUndefined();
    });
});
