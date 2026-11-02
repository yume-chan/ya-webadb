import * as assert from "node:assert";
import { describe, it } from "node:test";

import { u16, u32, u8 } from "./number.js";
import { Uint8ArrayExactReadable } from "./readable.js";
import { string } from "./string.js";
import { struct } from "./struct.js";

describe("Struct", () => {
    it("serialize", () => {
        const A = struct({ id: u8 }, { littleEndian: true });
        assert.deepStrictEqual(A.serialize({ id: 10 }), new Uint8Array([10]));
    });

    it("use struct as field", () => {
        const B = struct(
            { foo: struct({ bar: u8 }, { littleEndian: true }), baz: u16 },
            { littleEndian: true },
        );
        assert.deepStrictEqual(
            B.serialize({ foo: { bar: 10 }, baz: 20 }),
            new Uint8Array([10, 20, 0]),
        );
        assert.deepStrictEqual(
            B.deserialize(
                new Uint8ArrayExactReadable(new Uint8Array([10, 20, 0])),
            ),
            {
                foo: { bar: 10 },
                baz: 20,
            },
        );
    });

    describe("type", () => {
        it("should be `byob` when empty", () => {
            const A = struct({}, { littleEndian: true });
            assert.strictEqual(A.type, "byob");
        });

        it("should be `byob` if all fields are byob", () => {
            const A = struct({ a: u8 }, { littleEndian: true });
            assert.strictEqual(A.type, "byob");

            const B = struct({ a: u8, b: u16 }, { littleEndian: true });
            assert.strictEqual(B.type, "byob");

            const C = struct(
                { a: u8, b: u16, c: string(10) },
                { littleEndian: true },
            );
            assert.strictEqual(C.type, "byob");
        });

        it("should be `default` if any field is default", () => {
            const A = struct({ a: string(u32) }, { littleEndian: true });
            assert.strictEqual(A.type, "default");

            const B = struct(
                { a: string(u32), b: u32 },
                { littleEndian: true },
            );
            assert.strictEqual(B.type, "default");
        });
    });

    describe("size", () => {
        it("should be 0 when empty", () => {
            const A = struct({}, { littleEndian: true });
            assert.strictEqual(A.size, 0);
        });

        it("should be sum of all fields", () => {
            const A = struct({ a: u8, b: u16 }, { littleEndian: true });
            assert.strictEqual(A.size, 3);

            const B = struct({ a: string(10) }, { littleEndian: true });
            assert.strictEqual(B.size, 10);

            const C = struct({ a: string(u32) }, { littleEndian: true });
            assert.strictEqual(C.size, 4);
        });
    });
});
