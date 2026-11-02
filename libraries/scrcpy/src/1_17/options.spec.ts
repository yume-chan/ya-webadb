import * as assert from "node:assert";
import { describe, it } from "node:test";

import { ScrcpyOptions1_17 } from "./options.js";

describe("ScrcpyOptions1_17", () => {
    it("should share `value` with `base`", () => {
        const options = new ScrcpyOptions1_17({});
        // `setListDisplays` is implemented in `ScrcpyOptions1_16`,
        // but it should modify `value` of `ScrcpyOptions1_17`.
        options.setListDisplays();
        assert.strictEqual(options.value.displayId, -1);
    });

    describe("setListEncoders", () => {
        it("should set `encoderName` to `_`", () => {
            const options = new ScrcpyOptions1_17({});
            options.setListEncoders();
            assert.strictEqual(options.value.encoderName, "_");
        });
    });
});
