import { describe, expect, it } from "@jest/globals";

import { placeholder } from "./utils.js";

describe("placeholder", () => {
    it("should return `undefined`", () => {
        expect(placeholder()).toBe(undefined);
    });
});
