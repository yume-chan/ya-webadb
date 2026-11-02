import assert from "node:assert";
import { describe, it } from "node:test";

import { TextDecoderStream, TextEncoderStream } from "./encoding.js";

describe("global", () => {
    describe("TextDecoderStream", () => {
        it("should exist", () => {
            assert(!!TextDecoderStream, "TextDecoderStream should be defined");
        });
    });

    describe("TextEncoderStream", () => {
        it("should exist", () => {
            assert(!!TextEncoderStream, "TextEncoderStream should be defined");
        });
    });
});
