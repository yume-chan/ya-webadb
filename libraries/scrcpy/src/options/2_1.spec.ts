import * as assert from "node:assert";
import { describe, it } from "node:test";

import { ScrcpyOptions2_1 } from "./2_1.js";

describe("ScrcpyOptions2_1", () => {
    describe("setListDisplays", () => {
        it("should set `listDisplays` to `true`", () => {
            const options = new ScrcpyOptions2_1({});
            options.setListDisplays();
            assert.strictEqual(options.value.listDisplays, true);
        });
    });

    describe("setListEncoders", () => {
        it("should set `listEncoders` to `true`", () => {
            const options = new ScrcpyOptions2_1({});
            options.setListEncoders();
            assert.strictEqual(options.value.listEncoders, true);
        });
    });
});
