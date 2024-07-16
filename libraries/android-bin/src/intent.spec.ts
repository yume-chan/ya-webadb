import * as assert from "node:assert";
import { describe, it } from "node:test";

import { IntentBuilder } from "./intent.js";

describe("Intent", () => {
    describe("IntentBuilder", () => {
        it("should set intent action", () => {
            assert.deepStrictEqual(
                new IntentBuilder().setAction("test_action").build(),
                ["-a", "test_action"],
            );
        });

        it("should set intent categories", () => {
            assert.deepStrictEqual(
                new IntentBuilder()
                    .addCategory("category_1")
                    .addCategory("category_2")
                    .build(),
                ["-c", "category_1", "-c", "category_2"],
            );
        });

        it("should set intent package", () => {
            assert.deepStrictEqual(
                new IntentBuilder().setPackage("package_1").build(),
                ["-p", "package_1"],
            );
        });

        it("should set intent component", () => {
            assert.deepStrictEqual(
                new IntentBuilder().setComponent("component_1").build(),
                ["-n", "component_1"],
            );
        });

        it("should set intent data", () => {
            assert.deepStrictEqual(
                new IntentBuilder().setData("data_1").build(),
                ["-d", "data_1"],
            );
        });

        it("should pass intent extras", () => {
            assert.deepStrictEqual(
                new IntentBuilder().addStringExtra("key1", "value1").build(),
                ["--es", "key1", "value1"],
            );
        });
    });
});
