import * as assert from "node:assert";
import { describe, it } from "node:test";

import { CodecOptions } from "./codec-options.js";

describe("CodecOptions", () => {
    describe("setInt", () => {
        it("should omit type", () => {
            assert.strictEqual(
                new CodecOptions().setInt("profile", 42).toOptionValue(),
                "profile=42",
            );
        });
    });

    describe("setFloat", () => {
        it("should add type", () => {
            assert.strictEqual(
                new CodecOptions()
                    .setFloat("max-fps-to-encoder", 88.88)
                    .toOptionValue(),
                "max-fps-to-encoder:float=88.88",
            );
        });
    });

    describe("setLong", () => {
        it("should add type", () => {
            assert.strictEqual(
                new CodecOptions()
                    .setLong("repeat-previous-frame-after", 100n)
                    .toOptionValue(),
                "repeat-previous-frame-after:long=100",
            );
        });
    });

    describe("setString", () => {
        it("should add type", () => {
            assert.strictEqual(
                new CodecOptions().setString("key", "value").toOptionValue(),
                "key:string=value",
            );
        });

        it("should escape commas", () => {
            assert.strictEqual(
                new CodecOptions().setString("key", "a,b,c").toOptionValue(),
                "key:string=a\\,b\\,c",
            );
        });
    });

    describe("toOptionValue", () => {
        it("should convert empty value to `undefined`", () => {
            assert.strictEqual(new CodecOptions().toOptionValue(), undefined);
        });

        it("should support multiple values", () => {
            assert.strictEqual(
                new CodecOptions()
                    .setInt("profile", 42)
                    .setFloat("max-fps-to-encoder", 88.88)
                    .setLong("repeat-previous-frame-after", 100n)
                    .setString("key", "value")
                    .toOptionValue(),
                "profile=42,max-fps-to-encoder:float=88.88,repeat-previous-frame-after:long=100,key:string=value",
            );
        });
    });
});
