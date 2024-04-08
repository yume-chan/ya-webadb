/* eslint-disable @typescript-eslint/no-floating-promises */
import assert from "node:assert";
import { describe, it } from "node:test";

import { ScrcpyOptions1_17 } from "./1_17.js";

describe("ScrcpyOptions1_17", () => {
    it("should share `value` with `base`", () => {
        const options = new ScrcpyOptions1_17({});
        assert.strictEqual(options.value, options["_base"].value);
    });

    describe("setListDisplays", () => {
        it("should set `displayId` to `-1`", () => {
            const options = new ScrcpyOptions1_17({});
            options.setListDisplays();
            assert.strictEqual(options.value.displayId, -1);
        });
    });

    describe("setListEncoders", () => {
        it("should set `encoderName` to `_`", () => {
            const options = new ScrcpyOptions1_17({});
            options.setListEncoders();
            assert.strictEqual(options.value.encoderName, "_");
        });
    });
});
