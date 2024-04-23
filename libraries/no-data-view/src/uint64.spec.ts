import { describe, expect, it } from "@jest/globals";

import {
    getUint64,
    getUint64BigEndian,
    getUint64LittleEndian,
    setUint64,
    setUint64BigEndian,
    setUint64LittleEndian,
} from "./uint64.js";

describe("getUint64", () => {
    describe("little endian", () => {
        it("should work for minimal value", () => {
            const array = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
            expect(getUint64LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getBigUint64(0, true),
            );
        });

        it("should work for maximal value", () => {
            const array = new Uint8Array([
                0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            ]);
            expect(getUint64LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getBigUint64(0, true),
            );
        });

        it("should work for middle value", () => {
            const array = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0x80]);
            expect(getUint64LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getBigUint64(0, true),
            );
        });

        it("should work for random value", () => {
            const array = new Uint8Array([
                0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            ]);
            expect(getUint64LittleEndian(array, 0)).toBe(
                new DataView(array.buffer).getBigUint64(0, true),
            );
        });
    });

    describe("big endian", () => {
        it("should work for minimal value", () => {
            const array = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
            expect(getUint64BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getBigUint64(0, false),
            );
        });

        it("should work for maximal value", () => {
            const array = new Uint8Array([
                0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            ]);
            expect(getUint64BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getBigUint64(0, false),
            );
        });

        it("should work for middle value", () => {
            const array = new Uint8Array([0x80, 0, 0, 0, 0, 0, 0, 0]);
            expect(getUint64BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getBigUint64(0, false),
            );
        });

        it("should work for random value", () => {
            const array = new Uint8Array([
                0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            ]);
            expect(getUint64BigEndian(array, 0)).toBe(
                new DataView(array.buffer).getBigUint64(0, false),
            );
        });
    });

    it("should work for selected endianness", () => {
        const array = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        expect(getUint64(array, 0, false)).toBe(
            new DataView(array.buffer).getBigUint64(0, false),
        );
        expect(getUint64(array, 0, true)).toBe(
            new DataView(array.buffer).getBigUint64(0, true),
        );
    });
});

describe("setUint64", () => {
    describe("little endian", () => {
        it("should work for minimal value", () => {
            const expected = new Uint8Array(8);
            new DataView(expected.buffer).setBigUint64(0, 0n, true);
            const actual = new Uint8Array(8);
            setUint64LittleEndian(actual, 0, 0n);
            expect(actual).toEqual(expected);
        });

        it("should work for maximal value", () => {
            const expected = new Uint8Array(8);
            new DataView(expected.buffer).setBigUint64(
                0,
                0xffff_ffff_ffff_ffffn,
                true,
            );
            const actual = new Uint8Array(8);
            setUint64LittleEndian(actual, 0, 0xffff_ffff_ffff_ffffn);
            expect(actual).toEqual(expected);
        });

        it("should work for middle value", () => {
            const expected = new Uint8Array(8);
            new DataView(expected.buffer).setBigUint64(
                0,
                0x8000_0000_0000_0000n,
                true,
            );
            const actual = new Uint8Array(8);
            setUint64LittleEndian(actual, 0, 0x8000_0000_0000_0000n);
            expect(actual).toEqual(expected);
        });
    });

    describe("big endian", () => {
        it("should work for minimal value", () => {
            const expected = new Uint8Array(8);
            new DataView(expected.buffer).setBigUint64(0, 0n, false);
            const actual = new Uint8Array(8);
            setUint64BigEndian(actual, 0, 0n);
            expect(actual).toEqual(expected);
        });

        it("should work for maximal value", () => {
            const expected = new Uint8Array(8);
            new DataView(expected.buffer).setBigUint64(
                0,
                0xffff_ffff_ffff_ffffn,
                false,
            );
            const actual = new Uint8Array(8);
            setUint64BigEndian(actual, 0, 0xffff_ffff_ffff_ffffn);
            expect(actual).toEqual(expected);
        });

        it("should work for middle value", () => {
            const expected = new Uint8Array(8);
            new DataView(expected.buffer).setBigUint64(
                0,
                0x8000_0000_0000_0000n,
                false,
            );
            const actual = new Uint8Array(8);
            setUint64BigEndian(actual, 0, 0x8000_0000_0000_0000n);
            expect(actual).toEqual(expected);
        });
    });

    it("should work for selected endianness", () => {
        const expected = new Uint8Array(8);
        const actual = new Uint8Array(8);

        new DataView(expected.buffer).setBigUint64(
            0,
            0xffff_ffff_ffff_ffffn,
            false,
        );
        setUint64(actual, 0, 0xffff_ffff_ffff_ffffn, false);
        expect(actual).toEqual(expected);

        new DataView(expected.buffer).setBigUint64(
            0,
            0xffff_ffff_ffff_ffffn,
            true,
        );
        setUint64(actual, 0, 0xffff_ffff_ffff_ffffn, true);
        expect(actual).toEqual(expected);
    });
});
