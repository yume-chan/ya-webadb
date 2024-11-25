import * as assert from "node:assert";
import { describe, it } from "node:test";

import { ScrcpyOptions1_15 } from "./options.js";

describe("ScrcpyOptions1_15", () => {
    describe("serialize", () => {
        it("should return `-` for default values", () => {
            assert.deepStrictEqual(new ScrcpyOptions1_15({}).serialize(), [
                "debug",
                "0",
                "8000000",
                "0",
                "-1",
                "false",
                "-",
                "true",
                "true",
                "0",
                "false",
                "false",
                "-",
            ]);
        });
    });

    describe("setListDisplays", () => {
        it("should set `display` to `-1`", () => {
            const options = new ScrcpyOptions1_15({});
            options.setListDisplays();
            assert.strictEqual(options.value.displayId, -1);
        });
    });
});
