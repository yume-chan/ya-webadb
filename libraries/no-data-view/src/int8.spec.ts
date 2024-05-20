import { describe, expect, it } from "@jest/globals";

import { getInt8 } from "./int8.js";

describe("getInt8", () => {
    it("should work for minimal value", () => {
        const array = new Uint8Array([0x80]);
        expect(getInt8(array, 0)).toBe(new DataView(array.buffer).getInt8(0));
    });

    it("should work for maximal value", () => {
        const array = new Uint8Array([0x7f]);
        expect(getInt8(array, 0)).toBe(new DataView(array.buffer).getInt8(0));
    });

    it("should work for middle value", () => {
        const array = new Uint8Array([0]);
        expect(getInt8(array, 0)).toBe(new DataView(array.buffer).getInt8(0));
    });
});
