import { describe, expect, it } from "@jest/globals";

import {
    getUint16,
    getUint16BigEndian,
    getUint16LittleEndian,
} from "./uint16.js";

describe("getUint16", () => {
    describe("little endian", () => {
        it("should work for minimal value", () => {
            const array = new Uint8Array([0, 0]);
            expect(getUint16LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getUint16(0, true),
            );
        });

        it("should work for maximal value", () => {
            const array = new Uint8Array([255, 255]);
            expect(getUint16LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getUint16(0, true),
            );
        });

        it("should work for middle value", () => {
            const array = new Uint8Array([0, 128]);
            expect(getUint16LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getUint16(0, true),
            );
        });

        it("should work for random value", () => {
            const array = new Uint8Array([1, 2]);
            expect(getUint16LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getUint16(0, true),
            );
        });
    });

    describe("big endian", () => {
        it("should work for minimal value", () => {
            const array = new Uint8Array([0, 0]);
            expect(getUint16BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getUint16(0, false),
            );
        });

        it("should work for maximal value", () => {
            const array = new Uint8Array([255, 255]);
            expect(getUint16BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getUint16(0, false),
            );
        });

        it("should work for middle value", () => {
            const array = new Uint8Array([128, 255]);
            expect(getUint16BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getUint16(0, false),
            );
        });

        it("should work for random value", () => {
            const array = new Uint8Array([1, 2]);
            expect(getUint16BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getUint16(0, false),
            );
        });
    });

    it("should work for selected endianness", () => {
        const array = new Uint8Array([1, 2]);
        expect(getUint16(array, 0, false)).toBe(
            new DataView(array.buffer).getUint16(0, false),
        );
        expect(getUint16(array, 0, true)).toBe(
            new DataView(array.buffer).getUint16(0, true),
        );
    });
});
