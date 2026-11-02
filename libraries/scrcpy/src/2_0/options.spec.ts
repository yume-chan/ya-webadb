import * as assert from "node:assert";
import { describe, it } from "node:test";

import { ScrcpyOptions2_0 } from "./options.js";

describe("ScrcpyOptions2_0", () => {
    describe("setListDisplays", () => {
        it("should set `listDisplays` to `true`", () => {
            const options = new ScrcpyOptions2_0({});
            options.setListDisplays();
            assert.strictEqual(options.value.listDisplays, true);
        });
    });

    describe("setListEncoders", () => {
        it("should set `listEncoders` to `true`", () => {
            const options = new ScrcpyOptions2_0({});
            options.setListEncoders();
            assert.strictEqual(options.value.listEncoders, true);
        });
    });
});
