import * as assert from "node:assert";
import { describe, it } from "node:test";

import {
    getInt64,
    getInt64BigEndian,
    getInt64LittleEndian,
    setInt64,
    setInt64BigEndian,
    setInt64LittleEndian,
} from "./int64.js";

describe("getInt64", () => {
    describe("little endian", () => {
        it("should work for minimal value", () => {
            const array = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0x80]);
            assert.strictEqual(
                getInt64LittleEndian(array, 0),
                new DataView(array.buffer).getBigInt64(0, true),
            );
        });

        it("should work for maximal value", () => {
            const array = new Uint8Array([
                0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f,
            ]);
            assert.strictEqual(
                getInt64LittleEndian(array, 0),
                new DataView(array.buffer).getBigInt64(0, true),
            );
        });

        it("should work for middle value", () => {
            const array = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
            assert.strictEqual(
                getInt64LittleEndian(array, 0),
                new DataView(array.buffer).getBigInt64(0, true),
            );
        });

        it("should work for random value", () => {
            const array = new Uint8Array([
                0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            ]);
            assert.strictEqual(
                getInt64LittleEndian(array, 0),
                new DataView(array.buffer).getBigInt64(0, true),
            );
        });
    });

    describe("big endian", () => {
        it("should work for minimal value", () => {
            const array = new Uint8Array([0x80, 0, 0, 0, 0, 0, 0, 0]);
            assert.strictEqual(
                getInt64BigEndian(array, 0),
                new DataView(array.buffer).getBigInt64(0, false),
            );
        });

        it("should work for maximal value", () => {
            const array = new Uint8Array([
                0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            ]);
            assert.strictEqual(
                getInt64BigEndian(array, 0),
                new DataView(array.buffer).getBigInt64(0, false),
            );
        });

        it("should work for middle value", () => {
            const array = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
            assert.strictEqual(
                getInt64BigEndian(array, 0),
                new DataView(array.buffer).getBigInt64(0, false),
            );
        });

        it("should work for random value", () => {
            const array = new Uint8Array([
                0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            ]);
            assert.strictEqual(
                getInt64BigEndian(array, 0),
                new DataView(array.buffer).getBigInt64(0, false),
            );
        });
    });

    it("should work for selected endianness", () => {
        const array = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        assert.strictEqual(
            getInt64(array, 0, false),
            new DataView(array.buffer).getBigInt64(0, false),
        );
        assert.strictEqual(
            getInt64(array, 0, true),
            new DataView(array.buffer).getBigInt64(0, true),
        );
    });
});

describe("setInt64", () => {
    describe("little endian", () => {
        it("should work for minimal value", () => {
            const expected = new Uint8Array(8);
            new DataView(expected.buffer).setBigInt64(
                0,
                -0x8000_0000_0000_0000n,
                true,
            );
            const actual = new Uint8Array(8);
            setInt64LittleEndian(actual, 0, -0x8000_0000_0000_0000n);
            assert.deepStrictEqual(actual, expected);
        });

        it("should work for maximal value", () => {
            const expected = new Uint8Array(8);
            new DataView(expected.buffer).setBigInt64(
                0,
                0x7fff_ffff_ffff_ffffn,
                true,
            );
            const actual = new Uint8Array(8);
            setInt64LittleEndian(actual, 0, 0x7fff_ffff_ffff_ffffn);
            assert.deepStrictEqual(actual, expected);
        });

        it("should work for middle value", () => {
            const expected = new Uint8Array(8);
            new DataView(expected.buffer).setBigInt64(
                0,
                0xedcb_a987_6543_2100n,
                true,
            );
            const actual = new Uint8Array(8);
            setInt64LittleEndian(actual, 0, 0xedcb_a987_6543_2100n);
            assert.deepStrictEqual(actual, expected);
        });

        it("should work for super-large value", () => {
            const value = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
            const expected = new Uint8Array(8);
            new DataView(expected.buffer).setBigInt64(0, value, true);
            const actual = new Uint8Array(8);
            setInt64LittleEndian(actual, 0, value);
            assert.deepStrictEqual(actual, expected);
        });
    });

    describe("big endian", () => {
        it("should work for minimal value", () => {
            const expected = new Uint8Array(8);
            new DataView(expected.buffer).setBigInt64(
                0,
                -0x8000_0000_0000_0000n,
                false,
            );
            const actual = new Uint8Array(8);
            setInt64BigEndian(actual, 0, -0x8000_0000_0000_0000n);
            assert.deepStrictEqual(actual, expected);
        });

        it("should work for maximal value", () => {
            const expected = new Uint8Array(8);
            new DataView(expected.buffer).setBigInt64(
                0,
                0x7fff_ffff_ffff_ffffn,
                false,
            );
            const actual = new Uint8Array(8);
            setInt64BigEndian(actual, 0, 0x7fff_ffff_ffff_ffffn);
            assert.deepStrictEqual(actual, expected);
        });

        it("should work for middle value", () => {
            const expected = new Uint8Array(8);
            new DataView(expected.buffer).setBigInt64(
                0,
                0xedcb_a987_6543_2100n,
                false,
            );
            const actual = new Uint8Array(8);
            setInt64BigEndian(actual, 0, 0xedcb_a987_6543_2100n);
            assert.deepStrictEqual(actual, expected);
        });

        it("should work for super-large value", () => {
            const value = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
            const expected = new Uint8Array(8);
            new DataView(expected.buffer).setBigInt64(0, value, false);
            const actual = new Uint8Array(8);
            setInt64BigEndian(actual, 0, value);
            assert.deepStrictEqual(actual, expected);
        });
    });

    it("should work for selected endianness", () => {
        const expected = new Uint8Array(8);
        const actual = new Uint8Array(8);

        new DataView(expected.buffer).setBigInt64(
            0,
            0x7fff_ffff_ffff_ffffn,
            false,
        );
        setInt64(actual, 0, 0x7fff_ffff_ffff_ffffn, false);
        assert.deepStrictEqual(actual, expected);

        new DataView(expected.buffer).setBigInt64(
            0,
            0x7fff_ffff_ffff_ffffn,
            true,
        );
        setInt64(actual, 0, 0x7fff_ffff_ffff_ffffn, true);
        assert.deepStrictEqual(actual, expected);
    });
});
