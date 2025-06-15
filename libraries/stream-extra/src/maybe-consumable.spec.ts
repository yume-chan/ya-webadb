import assert from "node:assert";
import { describe, it } from "node:test";

import { MaybeConsumable } from "./maybe-consumable.js";

describe("MaybeConsumable", () => {
    it("should export all symbols", () => {
        assert(
            !!MaybeConsumable.WrapWritableStream,
            "WrapWritableStream should be define",
        );

        assert(
            !!MaybeConsumable.WritableStream,
            "WritableStream should be define",
        );

        assert(!!MaybeConsumable.getValue, "getValue should be define");

        assert(!!MaybeConsumable.tryConsume, "tryConsume should be define");
    });
});
