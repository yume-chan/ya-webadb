import assert from "node:assert";
import { describe, it } from "node:test";

import { CompressionStream, DecompressionStream } from "./compression.js";

describe("global", () => {
    describe("CompressionStream", () => {
        it("should exist", () => {
            assert(!!CompressionStream, "CompressionStream should be defined");
        });
    });

    describe("DecompressionStream", () => {
        it("should exist", () => {
            assert(
                !!DecompressionStream,
                "DecompressionStream should be defined",
            );
        });
    });
});
