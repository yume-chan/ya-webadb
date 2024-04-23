import { describe, expect, it } from "@jest/globals";

import {
    getUint16,
    getUint16BigEndian,
    getUint16LittleEndian,
    setUint16,
    setUint16BigEndian,
    setUint16LittleEndian,
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

describe("setUint16", () => {
    describe("little endian", () => {
        it("should work for minimal value", () => {
            const expected = new Uint8Array(2);
            new DataView(expected.buffer).setUint16(0, 0, true);
            const actual = new Uint8Array(2);
            setUint16LittleEndian(actual, 0, 0);
            expect(actual).toEqual(expected);
        });

        it("should work for maximal value", () => {
            const expected = new Uint8Array(2);
            new DataView(expected.buffer).setUint16(0, 0xffff, true);
            const actual = new Uint8Array(2);
            setUint16LittleEndian(actual, 0, 0xffff);
            expect(actual).toEqual(expected);
        });

        it("should work for middle value", () => {
            const expected = new Uint8Array(2);
            new DataView(expected.buffer).setUint16(0, 0x8000, true);
            const actual = new Uint8Array(2);
            setUint16LittleEndian(actual, 0, 0x8000);
            expect(actual).toEqual(expected);
        });
    });

    describe("big endian", () => {
        it("should work for minimal value", () => {
            const expected = new Uint8Array(2);
            new DataView(expected.buffer).setUint16(0, 0, false);
            const actual = new Uint8Array(2);
            setUint16BigEndian(actual, 0, 0);
            expect(actual).toEqual(expected);
        });

        it("should work for maximal value", () => {
            const expected = new Uint8Array(2);
            new DataView(expected.buffer).setUint16(0, 0xffff, false);
            const actual = new Uint8Array(2);
            setUint16BigEndian(actual, 0, 0xffff);
            expect(actual).toEqual(expected);
        });

        it("should work for middle value", () => {
            const expected = new Uint8Array(2);
            new DataView(expected.buffer).setUint16(0, 0x8000, false);
            const actual = new Uint8Array(2);
            setUint16BigEndian(actual, 0, 0x8000);
            expect(actual).toEqual(expected);
        });
    });

    it("should work for selected endianness", () => {
        const expected = new Uint8Array(2);
        const actual = new Uint8Array(2);

        new DataView(expected.buffer).setUint16(0, 0xffff, false);
        setUint16(actual, 0, 0xffff, false);
        expect(actual).toEqual(expected);

        new DataView(expected.buffer).setUint16(0, 0xffff, true);
        setUint16(actual, 0, 0xffff, true);
        expect(actual).toEqual(expected);
    });
});
