import * as assert from "node:assert";
import { describe, it } from "node:test";

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
            assert.strictEqual(
                getUint64LittleEndian(array, 0),
                new DataView(array.buffer).getBigUint64(0, true),
            );
        });

        it("should work for maximal value", () => {
            const array = new Uint8Array([
                0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            ]);
            assert.strictEqual(
                getUint64LittleEndian(array, 0),
                new DataView(array.buffer).getBigUint64(0, true),
            );
        });

        it("should work for middle value", () => {
            const array = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0x80]);
            assert.strictEqual(
                getUint64LittleEndian(array, 0),
                new DataView(array.buffer).getBigUint64(0, true),
            );
        });

        it("should work for random value", () => {
            const array = new Uint8Array([
                0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            ]);
            assert.strictEqual(
                getUint64LittleEndian(array, 0),
                new DataView(array.buffer).getBigUint64(0, true),
            );
        });
    });

    describe("big endian", () => {
        it("should work for minimal value", () => {
            const array = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
            assert.strictEqual(
                getUint64BigEndian(array, 0),
                new DataView(array.buffer).getBigUint64(0, false),
            );
        });

        it("should work for maximal value", () => {
            const array = new Uint8Array([
                0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            ]);
            assert.strictEqual(
                getUint64BigEndian(array, 0),
                new DataView(array.buffer).getBigUint64(0, false),
            );
        });

        it("should work for middle value", () => {
            const array = new Uint8Array([0x80, 0, 0, 0, 0, 0, 0, 0]);
            assert.strictEqual(
                getUint64BigEndian(array, 0),
                new DataView(array.buffer).getBigUint64(0, false),
            );
        });

        it("should work for random value", () => {
            const array = new Uint8Array([
                0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            ]);
            assert.strictEqual(
                getUint64BigEndian(array, 0),
                new DataView(array.buffer).getBigUint64(0, false),
            );
        });
    });

    it("should work for selected endianness", () => {
        const array = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        assert.strictEqual(
            getUint64(array, 0, false),
            new DataView(array.buffer).getBigUint64(0, false),
        );
        assert.strictEqual(
            getUint64(array, 0, true),
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
            assert.deepStrictEqual(actual, expected);
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
            assert.deepStrictEqual(actual, expected);
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
            assert.deepStrictEqual(actual, expected);
        });
    });

    describe("big endian", () => {
        it("should work for minimal value", () => {
            const expected = new Uint8Array(8);
            new DataView(expected.buffer).setBigUint64(0, 0n, false);
            const actual = new Uint8Array(8);
            setUint64BigEndian(actual, 0, 0n);
            assert.deepStrictEqual(actual, expected);
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
            assert.deepStrictEqual(actual, expected);
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
            assert.deepStrictEqual(actual, expected);
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
        assert.deepStrictEqual(actual, expected);

        new DataView(expected.buffer).setBigUint64(
            0,
            0xffff_ffff_ffff_ffffn,
            true,
        );
        setUint64(actual, 0, 0xffff_ffff_ffff_ffffn, true);
        assert.deepStrictEqual(actual, expected);
    });
});
