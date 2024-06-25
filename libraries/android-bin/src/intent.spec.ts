import { describe, expect, it } from "@jest/globals";
import { IntentBuilder } from "./intent.js";

describe("Intent", () => {
    describe("IntentBuilder", () => {

        it("should set intent action", () => {
            expect(
                new IntentBuilder()
                    .setAction("test_action")
                    .build(),
            ).toEqual(["-a", "test_action"]);
        });

        it("should set intent categories", () => {
            expect(
                new IntentBuilder()
                    .addCategory("category_1")
                    .addCategory("category_2")
                    .build(),
            ).toEqual(["-c", "category_1", "-c", "category_2"]);
        });

        it("should set intent package", () => {
            expect(
                new IntentBuilder()
                    .setPackage("package_1")
                    .build(),
            ).toEqual(["-p", "package_1"]);
        });

        it("should set intent component", () => {
            expect(
                new IntentBuilder()
                    .setComponent("component_1")
                    .build(),
            ).toEqual(["-n", "component_1"]);
        });

        it("should set intent data", () => {
            expect(
                new IntentBuilder()
                    .setData("data_1")
                    .build(),
            ).toEqual(["-d", "data_1"]);
        });

        it("should pass intent extras", () => {
            expect(
                new IntentBuilder()
                    .addStringExtra("key1", "value1")
                    .build(),
            ).toEqual(["--es", "key1", "value1"]);
        });
    });
});
