import { describe, expect, it } from "@jest/globals";
import { getInt8, setInt8 } from "./int8.js";

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

describe("setInt8", () => {
    it("should work for minimal value", () => {
        const expected = new Uint8Array(1);
        new DataView(expected.buffer).setInt8(0, -0x80);
        const actual = new Uint8Array(1);
        setInt8(actual, 0, -0x80);
        expect(actual).toEqual(expected);
    });

    it("should work for maximal value", () => {
        const expected = new Uint8Array(1);
        new DataView(expected.buffer).setInt8(0, 0x7f);
        const actual = new Uint8Array(1);
        setInt8(actual, 0, 0x7f);
        expect(actual).toEqual(expected);
    });

    it("should work for middle value", () => {
        const expected = new Uint8Array(1);
        new DataView(expected.buffer).setInt8(0, 0);
        const actual = new Uint8Array(1);
        setInt8(actual, 0, 0);
        expect(actual).toEqual(expected);
    });
});
