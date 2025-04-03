import * as assert from "node:assert";
import { describe, it } from "node:test";

import type { Field } from "./field/index.js";
import { s16, s32, s8, u16, u32, u8 } from "./number.js";

function testNumber(
    name: string,
    field: Field<number, never, never, number>,
    size: number,
    signed: boolean,
) {
    describe(name, () => {
        it("should match size", () => {
            assert.strictEqual(field.size, size);
        });

        describe("serialize", () => {
            it("should serialize min value", () => {
                const minValue = signed ? -(2 ** (size * 8 - 1)) : 0;
                const buffer = field.serialize(minValue, {
                    littleEndian: true,
                });
                const expected = new Uint8Array(size);
                expected[size - 1] = signed ? 0x80 : 0x00;
                assert.deepStrictEqual(buffer, expected);
            });

            it("should serialize 0", () => {
                const buffer = field.serialize(0, {
                    littleEndian: true,
                });
                const expected = new Uint8Array(size);
                assert.deepStrictEqual(buffer, expected);
            });

            it("should serialize 1", () => {
                const buffer = field.serialize(1, {
                    littleEndian: true,
                });
                const expected = new Uint8Array(size);
                expected[0] = 1;
                assert.deepStrictEqual(buffer, expected);
            });

            it("should serialize max value", () => {
                const maxValue = signed
                    ? 2 ** (size * 8 - 1) - 1
                    : 2 ** (size * 8) - 1;
                const buffer = field.serialize(maxValue, {
                    littleEndian: true,
                });
                const expected = new Uint8Array(size);
                for (let i = 0; i < size - 1; i += 1) {
                    expected[i] = 0xff;
                }
                expected[size - 1] = signed ? 0x7f : 0xff;
                assert.deepStrictEqual(buffer, expected);
            });
        });
    });
}

describe("number", () => {
    testNumber("u8", u8, 1, false);
    testNumber("s8", s8, 1, true);
    testNumber("u16", u16, 2, false);
    testNumber("s16", s16, 2, true);
    testNumber("u32", u32, 4, false);
    testNumber("s32", s32, 4, true);
});
