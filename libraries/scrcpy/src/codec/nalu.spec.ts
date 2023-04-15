import { describe, expect, it } from "@jest/globals";

import { NaluSodbBitReader } from "./nalu.js";

describe("nalu", () => {
    describe.only("NaluSodbReader", () => {
        it("should throw error if no end bit found", () => {
            expect(
                () => new NaluSodbBitReader(new Uint8Array([0b00000000]))
            ).toThrowError();
            expect(
                () =>
                    new NaluSodbBitReader(
                        new Uint8Array([0b00000000, 0b00000000])
                    )
            ).toThrowError();
        });

        it("should throw error if read after end bit", () => {
            let reader = new NaluSodbBitReader(new Uint8Array([0b10000000]));
            expect(() => reader.next()).toThrowError();

            reader = new NaluSodbBitReader(
                new Uint8Array([0b11111111, 0b10000000])
            );
            for (let i = 0; i < 8; i += 1) {
                expect(reader.next()).toBe(1);
            }
            expect(() => reader.next()).toThrowError();
        });

        it("should skip emulation prevent byte", () => {
            const reader = new NaluSodbBitReader(
                new Uint8Array([0xff, 0x00, 0x00, 0x03, 0xff, 0x80])
            );
            for (let i = 0; i < 8; i += 1) {
                expect(reader.next()).toBe(1);
            }
            for (let i = 0; i < 16; i += 1) {
                expect(reader.next()).toBe(0);
            }
            for (let i = 0; i < 8; i += 1) {
                expect(reader.next()).toBe(1);
            }
        });

        it("should skip successive emulation prevent bytes", () => {
            const reader = new NaluSodbBitReader(
                new Uint8Array([
                    0xff, 0x00, 0x00, 0x03, 0x00, 0x00, 0x03, 0xff, 0x80,
                ])
            );
            for (let i = 0; i < 8; i += 1) {
                expect(reader.next()).toBe(1);
            }
            for (let i = 0; i < 32; i += 1) {
                expect(reader.next()).toBe(0);
            }
            for (let i = 0; i < 8; i += 1) {
                expect(reader.next()).toBe(1);
            }
        });

        it("should read bits in Big Endian", () => {
            let reader = new NaluSodbBitReader(new Uint8Array([0b10110011]));
            expect(reader.next()).toBe(1);
            expect(reader.next()).toBe(0);
            expect(reader.next()).toBe(1);
            expect(reader.next()).toBe(1);
            expect(reader.next()).toBe(0);
            expect(reader.next()).toBe(0);
            expect(reader.next()).toBe(1);

            reader = new NaluSodbBitReader(new Uint8Array([0b01001100]));
            expect(reader.next()).toBe(0);
            expect(reader.next()).toBe(1);
            expect(reader.next()).toBe(0);
            expect(reader.next()).toBe(0);
            expect(reader.next()).toBe(1);
        });
    });
});
