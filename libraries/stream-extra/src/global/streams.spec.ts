import assert from "node:assert";
import { describe, it } from "node:test";

import {
    ByteLengthQueuingStrategy,
    CountQueuingStrategy,
    ReadableStream,
    ReadableStreamBYOBReader,
    ReadableStreamDefaultReader,
    TransformStream,
    WritableStream,
    WritableStreamDefaultWriter,
} from "./streams.js";

describe("global", () => {
    describe("ByteLengthQueuingStrategy", () => {
        it("should exist", () => {
            assert(
                !!ByteLengthQueuingStrategy,
                "ByteLengthQueuingStrategy should be defined",
            );
        });
    });
    describe("CountQueuingStrategy", () => {
        it("should exist", () => {
            assert(
                !!CountQueuingStrategy,
                "CountQueuingStrategy should be defined",
            );
        });
    });
    describe("ReadableStream", () => {
        it("should exist", () => {
            assert(!!ReadableStream, "ReadableStream should be defined");
        });
    });
    describe("ReadableStreamBYOBReader", () => {
        it("should exist", () => {
            assert(
                !!ReadableStreamBYOBReader,
                "ReadableStreamBYOBReader should be defined",
            );
        });
    });
    describe("ReadableStreamDefaultReader", () => {
        it("should exist", () => {
            assert(
                !!ReadableStreamDefaultReader,
                "ReadableStreamDefaultReader should be defined",
            );
        });
    });
    describe("TransformStream", () => {
        it("should exist", () => {
            assert(!!TransformStream, "TransformStream should be defined");
        });
    });
    describe("WritableStream", () => {
        it("should exist", () => {
            assert(!!WritableStream, "WritableStream should be defined");
        });
    });
    describe("WritableStreamDefaultWriter", () => {
        it("should exist", () => {
            assert(
                !!WritableStreamDefaultWriter,
                "WritableStreamDefaultWriter should be defined",
            );
        });
    });
});
