/* eslint-disable @typescript-eslint/no-floating-promises */
import assert from "node:assert";
import { describe, it } from "node:test";

import { NaluSodbBitReader } from "./nalu.js";

describe("nalu", () => {
    describe("NaluSodbReader", () => {
        it("should throw error if no end bit found", () => {
            assert.throws(
                () => new NaluSodbBitReader(new Uint8Array([0b00000000])),
                { name: "Error", message: "Stop bit not found" },
            );
            assert.throws(
                () =>
                    new NaluSodbBitReader(
                        new Uint8Array([0b00000000, 0b00000000]),
                    ),
                { name: "Error", message: "Stop bit not found" },
            );
        });

        it("should throw error if read after end bit", () => {
            let reader = new NaluSodbBitReader(new Uint8Array([0b10000000]));
            assert.throws(() => reader.next(), {
                name: "Error",
                message: "Bit index out of bounds",
            });

            reader = new NaluSodbBitReader(
                new Uint8Array([0b11111111, 0b10000000]),
            );
            for (let i = 0; i < 8; i += 1) {
                assert.strictEqual(reader.next(), 1);
            }
            assert.throws(() => reader.next(), {
                name: "Error",
                message: "Bit index out of bounds",
            });
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
        it("should read bits in Big Endian", () => {
            let reader = new NaluSodbBitReader(new Uint8Array([0b10110011]));
            assert.strictEqual(reader.next(), 1);
            assert.strictEqual(reader.next(), 0);
            assert.strictEqual(reader.next(), 1);
            assert.strictEqual(reader.next(), 1);
            assert.strictEqual(reader.next(), 0);
            assert.strictEqual(reader.next(), 0);
            assert.strictEqual(reader.next(), 1);

            reader = new NaluSodbBitReader(new Uint8Array([0b01001100]));
            assert.strictEqual(reader.next(), 0);
            assert.strictEqual(reader.next(), 1);
            assert.strictEqual(reader.next(), 0);
            assert.strictEqual(reader.next(), 0);
            assert.strictEqual(reader.next(), 1);
        });
    });
});
