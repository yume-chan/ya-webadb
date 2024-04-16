import { describe, expect, it } from "@jest/globals";

import {
    getUint32,
    getUint32BigEndian,
    getUint32LittleEndian,
    setUint32,
    setUint32BigEndian,
    setUint32LittleEndian,
} from "./uint32.js";

describe("getUint32", () => {
    describe("little endian", () => {
        it("should work for minimal value", () => {
            const array = new Uint8Array([0, 0, 0, 0]);
            expect(getUint32LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getUint32(0, true),
            );
        });

        it("should work for maximal value", () => {
            const array = new Uint8Array([255, 255, 255, 255]);
            expect(getUint32LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getUint32(0, true),
            );
        });

        it("should work for middle value", () => {
            const array = new Uint8Array([0, 0, 0, 128]);
            expect(getUint32LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getUint32(0, true),
            );
        });

        it("should work for random value", () => {
            const array = new Uint8Array([1, 2, 3, 4]);
            expect(getUint32LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getUint32(0, true),
            );
        });
    });

    describe("big endian", () => {
        it("should work for minimal value", () => {
            const array = new Uint8Array([0, 0, 0, 0]);
            expect(getUint32BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getUint32(0, false),
            );
        });

        it("should work for maximal value", () => {
            const array = new Uint8Array([255, 255, 255, 255]);
            expect(getUint32BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getUint32(0, false),
            );
        });

        it("should work for middle value", () => {
            const array = new Uint8Array([128, 0, 0, 0]);
            expect(getUint32BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getUint32(0, false),
            );
        });

        it("should work for random value", () => {
            const array = new Uint8Array([1, 2, 3, 4]);
            expect(getUint32BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getUint32(0, false),
            );
        });
    });

    it("should work for selected endianness", () => {
        const array = new Uint8Array([1, 2, 3, 4]);
        expect(getUint32(array, 0, false)).toBe(
            new DataView(array.buffer).getUint32(0, false),
        );
        expect(getUint32(array, 0, true)).toBe(
            new DataView(array.buffer).getUint32(0, true),
        );
    });
});

describe("setUint32", () => {
    describe("little endian", () => {
        it("should work for minimal value", () => {
            const expected = new Uint8Array(4);
            new DataView(expected.buffer).setUint32(0, 0, true);
            const actual = new Uint8Array(4);
            setUint32LittleEndian(actual, 0, 0);
            expect(actual).toEqual(expected);
        });

        it("should work for maximal value", () => {
            const expected = new Uint8Array(4);
            new DataView(expected.buffer).setUint32(0, 0xffff_ffff, true);
            const actual = new Uint8Array(4);
            setUint32LittleEndian(actual, 0, 0xffff_ffff);
            expect(actual).toEqual(expected);
        });

        it("should work for middle value", () => {
            const expected = new Uint8Array(4);
            new DataView(expected.buffer).setUint32(0, 0x8000_0000, true);
            const actual = new Uint8Array(4);
            setUint32LittleEndian(actual, 0, 0x8000_0000);
            expect(actual).toEqual(expected);
        });
    });

    describe("little endian", () => {
        it("should work for minimal value", () => {
            const expected = new Uint8Array(4);
            new DataView(expected.buffer).setUint32(0, 0, false);
            const actual = new Uint8Array(4);
            setUint32BigEndian(actual, 0, 0);
            expect(actual).toEqual(expected);
        });

        it("should work for maximal value", () => {
            const expected = new Uint8Array(4);
            new DataView(expected.buffer).setUint32(0, 0xffff_ffff, false);
            const actual = new Uint8Array(4);
            setUint32BigEndian(actual, 0, 0xffff_ffff);
            expect(actual).toEqual(expected);
        });

        it("should work for middle value", () => {
            const expected = new Uint8Array(4);
            new DataView(expected.buffer).setUint32(0, 0x8000_0000, false);
            const actual = new Uint8Array(4);
            setUint32BigEndian(actual, 0, 0x8000_0000);
            expect(actual).toEqual(expected);
        });
    });

    it("should work for selected endianness", () => {
        const expected = new Uint8Array(4);
        const actual = new Uint8Array(4);

        new DataView(expected.buffer).setUint32(0, 0xffff_ffff, false);
        setUint32(actual, 0, 0xffff_ffff, false);
        expect(actual).toEqual(expected);

        new DataView(expected.buffer).setUint32(0, 0xffff_ffff, true);
        setUint32(actual, 0, 0xffff_ffff, true);
        expect(actual).toEqual(expected);
    });
});
