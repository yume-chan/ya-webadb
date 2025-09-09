import * as assert from "node:assert";
import { describe, it } from "node:test";

import { NaluSodbBitReader } from "./nalu.js";

describe("nalu", () => {
    describe("NaluSodbReader", () => {
        describe("constructor", () => {
            it("should set `ended` if stream is effectively empty", () => {
                const reader = new NaluSodbBitReader(
                    new Uint8Array([0b10000000]),
                );
                assert.strictEqual(reader.ended, true);
            });

            it("should throw error if stream is empty", () => {
                assert.throws(
                    () => new NaluSodbBitReader(new Uint8Array(0)),
                    /Stop bit not found/,
                );
            });

            it("should throw error if no end bit found (single byte)", () => {
                assert.throws(
                    () => new NaluSodbBitReader(new Uint8Array(1)),
                    /Stop bit not found/,
                );
            });

            it("should throw error if no end bit found (multiple bytes)", () => {
                assert.throws(
                    () => new NaluSodbBitReader(new Uint8Array(10)),
                    /Stop bit not found/,
                );
            });
        });

        describe("next", () => {
            it("should read bits in Big Endian (single byte)", () => {
                const reader = new NaluSodbBitReader(
                    new Uint8Array([0b10110111]),
                );
                assert.strictEqual(reader.next(), 1);
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 1);
                assert.strictEqual(reader.next(), 1);
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 1);
                assert.strictEqual(reader.next(), 1);
            });

            it("should read bits in Big Endian (multiple bytes)", () => {
                const reader = new NaluSodbBitReader(
                    new Uint8Array([0b01001000, 0b10000100, 0b00010001]),
                );
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 1);
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 1);
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 1);
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 1);
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 1);
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 0);
                assert.strictEqual(reader.next(), 0);
            });

            it("should throw error if read after end bit (single byte, middle)", () => {
                const reader = new NaluSodbBitReader(
                    new Uint8Array([0b11111000]),
                );
                for (let i = 0; i < 4; i += 1) {
                    assert.strictEqual(reader.next(), 1);
                }
                assert.throws(() => reader.next(), /Bit index out of bounds/);
            });

            it("should throw error if read after end bit (single byte, end)", () => {
                const reader = new NaluSodbBitReader(
                    new Uint8Array([0b11111111]),
                );
                for (let i = 0; i < 7; i += 1) {
                    assert.strictEqual(reader.next(), 1);
                }
                assert.throws(() => reader.next(), /Bit index out of bounds/);
            });

            it("should throw error if read after end bit (multiple bytes, start)", () => {
                const reader = new NaluSodbBitReader(
                    new Uint8Array([0b11111111, 0b10000000]),
                );
                for (let i = 0; i < 8; i += 1) {
                    assert.strictEqual(reader.next(), 1);
                }
                assert.throws(() => reader.next(), /Bit index out of bounds/);
            });

            it("should throw error if read after end bit (multiple bytes, middle)", () => {
                const reader = new NaluSodbBitReader(
                    new Uint8Array([0b11111111, 0b11111000]),
                );
                for (let i = 0; i < 12; i += 1) {
                    assert.strictEqual(reader.next(), 1);
                }
                assert.throws(() => reader.next(), /Bit index out of bounds/);
            });

            it("should skip emulation prevent byte", () => {
                const reader = new NaluSodbBitReader(
                    new Uint8Array([0xff, 0x00, 0x00, 0x03, 0xff, 0x80]),
                );
                for (let i = 0; i < 8; i += 1) {
                    assert.strictEqual(reader.next(), 1);
                }
                for (let i = 0; i < 16; i += 1) {
                    assert.strictEqual(reader.next(), 0);
                }
                for (let i = 0; i < 8; i += 1) {
                    assert.strictEqual(reader.next(), 1);
                }
            });

            it("should skip successive emulation prevent bytes", () => {
                const reader = new NaluSodbBitReader(
                    new Uint8Array([
                        0xff, 0x00, 0x00, 0x03, 0x00, 0x00, 0x03, 0xff, 0x80,
                    ]),
                );
                for (let i = 0; i < 8; i += 1) {
                    assert.strictEqual(reader.next(), 1);
                }
                for (let i = 0; i < 32; i += 1) {
                    assert.strictEqual(reader.next(), 0);
                }
                for (let i = 0; i < 8; i += 1) {
                    assert.strictEqual(reader.next(), 1);
                }
            });
        });
    });

    describe("skip", () => {
        it("should skip <8 bits in single byte", () => {
            const reader = new NaluSodbBitReader(new Uint8Array([0b01000011]));

            reader.skip(1);
            assert.strictEqual(reader.next(), 1);

            assert.strictEqual(reader.next(), 0);

            reader.skip(3);
            assert.strictEqual(reader.next(), 1);
            assert.throws(() => reader.next(), /Bit index out of bounds/);
        });

        it("should skip <8 bits in multiple bytes", () => {
            const reader = new NaluSodbBitReader(
                new Uint8Array([0b00000100, 0b00101000]),
            );

            reader.skip(5);
            assert.strictEqual(reader.next(), 1);

            assert.strictEqual(reader.next(), 0);

            reader.skip(3);
            assert.strictEqual(reader.next(), 1);

            assert.strictEqual(reader.next(), 0);
            assert.throws(() => reader.next(), /Bit index out of bounds/);
        });

        it("should skip >8 bits without emulation prevention byte", () => {
            const reader = new NaluSodbBitReader(
                new Uint8Array([0b00000000, 0b00100001]),
            );
            reader.skip(10);
            assert.strictEqual(reader.next(), 1);

            assert.strictEqual(reader.next(), 0);
        });
    });
});
