import * as assert from "node:assert";
import { describe, it } from "node:test";

import { Uint8ArrayExactReadable } from "./readable.js";
import { string } from "./string.js";

describe("string", () => {
    it("should decode buffer as UTF-8", () => {
        const buffer = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]);
        const result = string(buffer.length).deserialize(
            new Uint8ArrayExactReadable(buffer),
            { dependencies: {} as never, littleEndian: true },
        );
        assert.strictEqual(result, "hello");
    });
});
