import * as assert from "node:assert";
import { describe, it } from "node:test";

import { buffer } from "./buffer.js";
import type { ExactReadable } from "./readable.js";
import {
    ExactReadableEndedError,
    Uint8ArrayExactReadable,
} from "./readable.js";
import { struct } from "./struct.js";

describe("buffer", () => {
    describe("fixed size", () => {
        it("should have correct size", () => {
            const a = buffer(10);
            assert.strictEqual(a.size, 10);
        });

        it("should deserialize", () => {
            const a = buffer(10);
            const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            assert.deepStrictEqual(
                a.deserialize(new Uint8ArrayExactReadable(data), {
                    dependencies: {} as never,
                    littleEndian: true,
                }),
                data,
            );
        });

        it("should throw for not enough data", () => {
            const a = buffer(10);
            const data = new Uint8Array([1, 2, 3, 4, 5]);
            assert.throws(
                () =>
                    a.deserialize(new Uint8ArrayExactReadable(data), {
                        dependencies: {} as never,
                        littleEndian: true,
                    }),
                /Error: ExactReadable ended/,
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
