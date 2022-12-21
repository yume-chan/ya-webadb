import { describe, expect, it } from "@jest/globals";

import { StructDefaultOptions } from "./options.js";

describe("StructDefaultOptions", () => {
    describe(".littleEndian", () => {
        it("should be `false`", () => {
            expect(StructDefaultOptions).toHaveProperty("littleEndian", false);
        });
    });
});
