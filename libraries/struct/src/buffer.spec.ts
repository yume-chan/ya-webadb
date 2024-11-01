import * as assert from "node:assert";
import { describe, it } from "node:test";

import { buffer } from "./buffer.js";
import type { ExactReadable } from "./readable.js";
import { ExactReadableEndedError } from "./readable.js";
import { struct } from "./struct.js";

describe("buffer", () => {
    describe("fixed size", () => {
        it("should deserialize", () => {
            const A = struct({ value: buffer(10) }, { littleEndian: false });
            const reader: ExactReadable = {
                position: 0,
                readExactly() {
                    return new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
                },
            };
            assert.deepStrictEqual(A.deserialize(reader), {
                value: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
            });
        });

        it("should throw for not enough data", () => {
            const A = struct({ value: buffer(10) }, { littleEndian: false });
            const reader: ExactReadable = {
                position: 0,
                readExactly() {
                    (this as { position: number }).position = 5;
                    throw new ExactReadableEndedError();
                },
            };
            assert.throws(
                () => A.deserialize(reader),
                /The underlying readable was ended before the struct was fully deserialized/,
            );
        });

        it("should throw for no data", () => {
            const A = struct({ value: buffer(10) }, { littleEndian: false });
            const reader: ExactReadable = {
                position: 0,
                readExactly() {
                    throw new ExactReadableEndedError();
                },
            };
            assert.throws(
                () => A.deserialize(reader),
                /The underlying readable doesn't contain any more struct/,
            );
        });
    });
});
