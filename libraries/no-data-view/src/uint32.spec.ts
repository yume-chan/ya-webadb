import * as assert from "node:assert";
import { describe, it } from "node:test";

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
            assert.strictEqual(
                getUint32LittleEndian(array, 0),
                new DataView(array.buffer).getUint32(0, true),
            );
        });

        it("should work for maximal value", () => {
            const array = new Uint8Array([255, 255, 255, 255]);
            assert.strictEqual(
                getUint32LittleEndian(array, 0),
                new DataView(array.buffer).getUint32(0, true),
            );
        });

        it("should work for middle value", () => {
            const array = new Uint8Array([0, 0, 0, 128]);
            assert.strictEqual(
                getUint32LittleEndian(array, 0),
                new DataView(array.buffer).getUint32(0, true),
            );
        });

        it("should work for random value", () => {
            const array = new Uint8Array([1, 2, 3, 4]);
            assert.strictEqual(
                getUint32LittleEndian(array, 0),
                new DataView(array.buffer).getUint32(0, true),
            );
        });
    });

    describe("big endian", () => {
        it("should work for minimal value", () => {
            const array = new Uint8Array([0, 0, 0, 0]);
            assert.strictEqual(
                getUint32BigEndian(array, 0),
                new DataView(array.buffer).getUint32(0, false),
            );
        });

        it("should work for maximal value", () => {
            const array = new Uint8Array([255, 255, 255, 255]);
            assert.strictEqual(
                getUint32BigEndian(array, 0),
                new DataView(array.buffer).getUint32(0, false),
            );
        });

        it("should work for middle value", () => {
            const array = new Uint8Array([128, 0, 0, 0]);
            assert.strictEqual(
                getUint32BigEndian(array, 0),
                new DataView(array.buffer).getUint32(0, false),
            );
        });

        it("should work for random value", () => {
            const array = new Uint8Array([1, 2, 3, 4]);
            assert.strictEqual(
                getUint32BigEndian(array, 0),
                new DataView(array.buffer).getUint32(0, false),
            );
        });
    });

    it("should work for selected endianness", () => {
        const array = new Uint8Array([1, 2, 3, 4]);
        assert.strictEqual(
            getUint32(array, 0, false),
            new DataView(array.buffer).getUint32(0, false),
        );
        assert.strictEqual(
            getUint32(array, 0, true),
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
            assert.deepStrictEqual(actual, expected);
        });

        it("should work for maximal value", () => {
            const expected = new Uint8Array(4);
            new DataView(expected.buffer).setUint32(0, 0xffff_ffff, true);
            const actual = new Uint8Array(4);
            setUint32LittleEndian(actual, 0, 0xffff_ffff);
            assert.deepStrictEqual(actual, expected);
        });

        it("should work for middle value", () => {
            const expected = new Uint8Array(4);
            new DataView(expected.buffer).setUint32(0, 0x8000_0000, true);
            const actual = new Uint8Array(4);
            setUint32LittleEndian(actual, 0, 0x8000_0000);
            assert.deepStrictEqual(actual, expected);
        });
    });

    describe("big endian", () => {
        it("should work for minimal value", () => {
            const expected = new Uint8Array(4);
            new DataView(expected.buffer).setUint32(0, 0, false);
            const actual = new Uint8Array(4);
            setUint32BigEndian(actual, 0, 0);
            assert.deepStrictEqual(actual, expected);
        });

        it("should work for maximal value", () => {
            const expected = new Uint8Array(4);
            new DataView(expected.buffer).setUint32(0, 0xffff_ffff, false);
            const actual = new Uint8Array(4);
            setUint32BigEndian(actual, 0, 0xffff_ffff);
            assert.deepStrictEqual(actual, expected);
        });

        it("should work for middle value", () => {
            const expected = new Uint8Array(4);
            new DataView(expected.buffer).setUint32(0, 0x8000_0000, false);
            const actual = new Uint8Array(4);
            setUint32BigEndian(actual, 0, 0x8000_0000);
            assert.deepStrictEqual(actual, expected);
        });
    });

    it("should work for selected endianness", () => {
        const expected = new Uint8Array(4);
        const actual = new Uint8Array(4);

        new DataView(expected.buffer).setUint32(0, 0xffff_ffff, false);
        setUint32(actual, 0, 0xffff_ffff, false);
        assert.deepStrictEqual(actual, expected);

        new DataView(expected.buffer).setUint32(0, 0xffff_ffff, true);
        setUint32(actual, 0, 0xffff_ffff, true);
        assert.deepStrictEqual(actual, expected);
    });
});
