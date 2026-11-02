import assert from "node:assert";
import { describe, it } from "node:test";

import { AbortController, AbortSignal } from "./abort-signal.js";

describe("global", () => {
    describe("AbortSignal", () => {
        it("should exist", () => {
            assert(!!AbortSignal, "AbortSignal should be defined");
        });
    });

    describe("AbortController", () => {
        it("should exist", () => {
            assert(!!AbortController, "AbortController should be defined");
        });
    });
});
