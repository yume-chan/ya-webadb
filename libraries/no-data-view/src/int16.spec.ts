import { describe, expect, it } from "@jest/globals";

import {
    getInt16,
    getInt16BigEndian,
    getInt16LittleEndian,
    setInt16,
    setInt16BigEndian,
    setInt16LittleEndian,
} from "./int16.js";

describe("getInt16", () => {
    describe("little endian", () => {
        it("should work for minimal value", () => {
            const array = new Uint8Array([0, 128]);
            expect(getInt16LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getInt16(0, true),
            );
        });

        it("should work for maximal value", () => {
            const array = new Uint8Array([255, 127]);
            expect(getInt16LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getInt16(0, true),
            );
        });

        it("should work for middle value", () => {
            const array = new Uint8Array([0, 0]);
            expect(getInt16LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getInt16(0, true),
            );
        });

        it("should work for random value", () => {
            const array = new Uint8Array([1, 2]);
            expect(getInt16LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getUint16(0, true),
            );
        });
    });

    describe("big endian", () => {
        it("should work for minimal value", () => {
            const array = new Uint8Array([128, 0]);
            expect(getInt16BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getInt16(0, false),
            );
        });

        it("should work for maximal value", () => {
            const array = new Uint8Array([127, 255]);
            expect(getInt16BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getInt16(0, false),
            );
        });

        it("should work for middle value", () => {
            const array = new Uint8Array([0, 0]);
            expect(getInt16BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getInt16(0, false),
            );
        });

        it("should work for random value", () => {
            const array = new Uint8Array([1, 2]);
            expect(getInt16BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getUint16(0, false),
            );
        });
    });

    it("should work for selected endianness", () => {
        const array = new Uint8Array([1, 2]);
        expect(getInt16(array, 0, false)).toBe(
            new DataView(array.buffer).getInt16(0, false),
        );
        expect(getInt16(array, 0, true)).toBe(
            new DataView(array.buffer).getInt16(0, true),
        );
    });
});

describe("setInt16", () => {
    describe("little endian", () => {
        it("should work for minimal value", () => {
            const expected = new Uint8Array(2);
            new DataView(expected.buffer).setInt16(0, -0x8000, true);
            const actual = new Uint8Array(2);
            setInt16LittleEndian(actual, 0, -0x8000);
            expect(actual).toEqual(expected);
        });

        it("should work for maximal value", () => {
            const expected = new Uint8Array(2);
            new DataView(expected.buffer).setInt16(0, 0x7fff, true);
            const actual = new Uint8Array(2);
            setInt16LittleEndian(actual, 0, 0x7fff);
            expect(actual).toEqual(expected);
        });

        it("should work for middle value", () => {
            const expected = new Uint8Array(2);
            new DataView(expected.buffer).setInt16(0, 0, true);
            const actual = new Uint8Array(2);
            setInt16LittleEndian(actual, 0, 0);
            expect(actual).toEqual(expected);
        });
    });

    describe("big endian", () => {
        it("should work for minimal value", () => {
            const expected = new Uint8Array(2);
            new DataView(expected.buffer).setInt16(0, -0x8000, false);
            const actual = new Uint8Array(2);
            setInt16BigEndian(actual, 0, -0x8000);
            expect(actual).toEqual(expected);
        });

        it("should work for maximal value", () => {
            const expected = new Uint8Array(2);
            new DataView(expected.buffer).setInt16(0, 0x7fff, false);
            const actual = new Uint8Array(2);
            setInt16BigEndian(actual, 0, 0x7fff);
            expect(actual).toEqual(expected);
        });

        it("should work for middle value", () => {
            const expected = new Uint8Array(2);
            new DataView(expected.buffer).setInt16(0, 0, false);
            const actual = new Uint8Array(2);
            setInt16BigEndian(actual, 0, 0);
            expect(actual).toEqual(expected);
        });
    });

    it("should work for selected endianness", () => {
        const expected = new Uint8Array(2);
        const actual = new Uint8Array(2);

        new DataView(expected.buffer).setInt16(0, 0x7fff, false);
        setInt16(actual, 0, 0x7fff, false);
        expect(actual).toEqual(expected);

        new DataView(expected.buffer).setInt16(0, 0x7fff, true);
        setInt16(actual, 0, 0x7fff, true);
        expect(actual).toEqual(expected);
    });
});
