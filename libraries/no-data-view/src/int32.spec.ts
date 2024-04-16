import { describe, expect, it } from "@jest/globals";

import { getInt32, getInt32BigEndian, getInt32LittleEndian } from "./int32.js";

describe("getInt32", () => {
    describe("little endian", () => {
        it("should work for minimal value", () => {
            const array = new Uint8Array([0, 0, 0, 128]);
            expect(getInt32LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getInt32(0, true),
            );
        });

        it("should work for maximal value", () => {
            const array = new Uint8Array([255, 255, 255, 127]);
            expect(getInt32LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getInt32(0, true),
            );
        });

        it("should work for middle value", () => {
            const array = new Uint8Array([0, 0, 0, 0]);
            expect(getInt32LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getInt32(0, true),
            );
        });

        it("should work for random value", () => {
            const array = new Uint8Array([1, 2, 3, 4]);
            expect(getInt32LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getInt32(0, true),
            );
        });
    });

    describe("big endian", () => {
        it("should work for minimal value", () => {
            const array = new Uint8Array([128, 0, 0, 0]);
            expect(getInt32BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getInt32(0, false),
            );
        });

        it("should work for maximal value", () => {
            const array = new Uint8Array([127, 255, 255, 255]);
            expect(getInt32BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getInt32(0, false),
            );
        });

        it("should work for middle value", () => {
            const array = new Uint8Array([0, 0, 0, 0]);
            expect(getInt32BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getInt32(0, false),
            );
        });

        it("should work for random value", () => {
            const array = new Uint8Array([1, 2, 3, 4]);
            expect(getInt32BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getInt32(0, false),
            );
        });
    });

    it("should work for selected endianness", () => {
        const array = new Uint8Array([1, 2, 3, 4]);
        expect(getInt32(array, 0, false)).toBe(
            new DataView(array.buffer).getInt32(0, false),
        );
        expect(getInt32(array, 0, true)).toBe(
            new DataView(array.buffer).getInt32(0, true),
        );
    });
});
