import * as assert from "node:assert";
import { describe, it } from "node:test";

import type { Reader } from "./string-format.js";
import { ParseError, p } from "./string-format.js";

describe("StringFormat", () => {
    describe("digits", () => {
        it("should match 0-9", () => {
            const reader: Reader = { value: "1234567890", position: 0 };
            assert.equal(p.digits().parse(reader), 1234567890);
        });

        const digitsError = new ParseError("0123456789".split(""));

        it("should throw if input is empty", () => {
            const reader: Reader = { value: "", position: 0 };
            assert.throws(() => p.digits().parse(reader), digitsError);
        });

        it("should throw error if not 0-9", () => {
            const reader: Reader = { value: "a", position: 0 };
            assert.throws(() => p.digits().parse(reader), digitsError);
        });
    });
});
