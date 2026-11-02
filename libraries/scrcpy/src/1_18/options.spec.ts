import * as assert from "node:assert";
import { describe, it } from "node:test";

import { ScrcpyOptions1_18 } from "./options.js";

describe("ScrcpyOptions1_18", () => {
    it("should share `value` with `base`", () => {
        const options = new ScrcpyOptions1_18({});
        // `setListDisplays` is implemented in `ScrcpyOptions1_16`,
        // but it should modify `value` of `ScrcpyOptions1_18`.
        options.setListDisplays();
        assert.strictEqual(options.value.displayId, -1);
    });
});
