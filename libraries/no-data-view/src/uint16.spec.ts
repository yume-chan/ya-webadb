import * as assert from "node:assert";
import { describe, it } from "node:test";

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
            assert.strictEqual(
                getUint16LittleEndian(array, 0),
                new DataView(array.buffer).getUint16(0, true),
            );
        });

        it("should work for maximal value", () => {
            const array = new Uint8Array([255, 255]);
            assert.strictEqual(
                getUint16LittleEndian(array, 0),
                new DataView(array.buffer).getUint16(0, true),
            );
        });

        it("should work for middle value", () => {
            const array = new Uint8Array([0, 128]);
            assert.strictEqual(
                getUint16LittleEndian(array, 0),
                new DataView(array.buffer).getUint16(0, true),
            );
        });

        it("should work for random value", () => {
            const array = new Uint8Array([1, 2]);
            assert.strictEqual(
                getUint16LittleEndian(array, 0),
                new DataView(array.buffer).getUint16(0, true),
            );
        });
    });

    describe("big endian", () => {
        it("should work for minimal value", () => {
            const array = new Uint8Array([0, 0]);
            assert.strictEqual(
                getUint16BigEndian(array, 0),
                new DataView(array.buffer).getUint16(0, false),
            );
        });

        it("should work for maximal value", () => {
            const array = new Uint8Array([255, 255]);
            assert.strictEqual(
                getUint16BigEndian(array, 0),
                new DataView(array.buffer).getUint16(0, false),
            );
        });

        it("should work for middle value", () => {
            const array = new Uint8Array([128, 255]);
            assert.strictEqual(
                getUint16BigEndian(array, 0),
                new DataView(array.buffer).getUint16(0, false),
            );
        });

        it("should work for random value", () => {
            const array = new Uint8Array([1, 2]);
            assert.strictEqual(
                getUint16BigEndian(array, 0),
                new DataView(array.buffer).getUint16(0, false),
            );
        });
    });

    it("should work for selected endianness", () => {
        const array = new Uint8Array([1, 2]);
        assert.strictEqual(
            getUint16(array, 0, false),
            new DataView(array.buffer).getUint16(0, false),
        );
        assert.strictEqual(
            getUint16(array, 0, true),
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
            assert.deepStrictEqual(actual, expected);
        });

        it("should work for maximal value", () => {
            const expected = new Uint8Array(2);
            new DataView(expected.buffer).setUint16(0, 0xffff, true);
            const actual = new Uint8Array(2);
            setUint16LittleEndian(actual, 0, 0xffff);
            assert.deepStrictEqual(actual, expected);
        });

        it("should work for middle value", () => {
            const expected = new Uint8Array(2);
            new DataView(expected.buffer).setUint16(0, 0x8000, true);
            const actual = new Uint8Array(2);
            setUint16LittleEndian(actual, 0, 0x8000);
            assert.deepStrictEqual(actual, expected);
        });
    });

    describe("big endian", () => {
        it("should work for minimal value", () => {
            const expected = new Uint8Array(2);
            new DataView(expected.buffer).setUint16(0, 0, false);
            const actual = new Uint8Array(2);
            setUint16BigEndian(actual, 0, 0);
            assert.deepStrictEqual(actual, expected);
        });

        it("should work for maximal value", () => {
            const expected = new Uint8Array(2);
            new DataView(expected.buffer).setUint16(0, 0xffff, false);
            const actual = new Uint8Array(2);
            setUint16BigEndian(actual, 0, 0xffff);
            assert.deepStrictEqual(actual, expected);
        });

        it("should work for middle value", () => {
            const expected = new Uint8Array(2);
            new DataView(expected.buffer).setUint16(0, 0x8000, false);
            const actual = new Uint8Array(2);
            setUint16BigEndian(actual, 0, 0x8000);
            assert.deepStrictEqual(actual, expected);
        });
    });

    it("should work for selected endianness", () => {
        const expected = new Uint8Array(2);
        const actual = new Uint8Array(2);

        new DataView(expected.buffer).setUint16(0, 0xffff, false);
        setUint16(actual, 0, 0xffff, false);
        assert.deepStrictEqual(actual, expected);

        new DataView(expected.buffer).setUint16(0, 0xffff, true);
        setUint16(actual, 0, 0xffff, true);
        assert.deepStrictEqual(actual, expected);
    });
});
