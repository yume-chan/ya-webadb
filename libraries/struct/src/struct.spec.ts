import * as assert from "node:assert";
import { describe, it } from "node:test";

import { u16, u8 } from "./number.js";
import { Uint8ArrayExactReadable } from "./readable.js";
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
});
