import assert from "node:assert";
import { describe, it } from "node:test";

import { Consumable } from "./consumable.js";

describe("Consumable", () => {
    it("should export all symbols", () => {
        assert(!!Consumable.WritableStream, "WritableStream should be define");

        assert(
            !!Consumable.WrapWritableStream,
            "WrapWritableStream should be define",
        );

        assert(!!Consumable.ReadableStream, "ReadableStream should be define");

        assert(
            !!Consumable.WrapByteReadableStream,
            "WrapByteReadableStream should be define",
        );
    });
});
