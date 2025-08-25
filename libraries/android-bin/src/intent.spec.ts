import * as assert from "node:assert";
import { describe, it } from "node:test";

import { serializeIntent } from "./intent.js";

describe("Intent", () => {
    describe("serializeIntent", () => {
        it("should set intent action", () => {
            assert.deepStrictEqual(serializeIntent({ action: "test_action" }), [
                "-a",
                "test_action",
            ]);
        });

        it("should set intent categories", () => {
            assert.deepStrictEqual(
                serializeIntent({ categories: ["category_1", "category_2"] }),
                ["-c", "category_1", "-c", "category_2"],
            );
        });

        it("should set intent package", () => {
            assert.deepStrictEqual(serializeIntent({ package: "package_1" }), [
                "-p",
                "package_1",
            ]);
        });

        it("should set intent component", () => {
            assert.deepStrictEqual(
                serializeIntent({
                    component: {
                        packageName: "package_1",
                        className: "component_1",
                    },
                }),
                ["-n", "package_1/component_1"],
            );
        });

        it("should set intent data", () => {
            assert.deepStrictEqual(serializeIntent({ data: "data_1" }), [
                "-d",
                "data_1",
            ]);
        });

        it("should pass intent extras", () => {
            assert.deepStrictEqual(
                serializeIntent({
                    extras: {
                        key1: "value1",
                    },
                }),
                ["--es", "key1", "value1"],
            );
        });
    });
});
