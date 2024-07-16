import * as assert from "node:assert";
import { describe, it } from "node:test";

import { ScrcpyOptions1_24 } from "../1_24.js";

import { ScrcpyOptions1_25 } from "./options.js";

describe("ScrcpyOptions1_25", () => {
    it("should return a different scroll controller", () => {
        const controller1_24 = new ScrcpyOptions1_24(
            {},
        ).createScrollController();
        const controller1_25 = new ScrcpyOptions1_25(
            {},
        ).createScrollController();
        assert.notStrictEqual(controller1_25, controller1_24);
    });

    describe("setListDisplays", () => {
        it("should set `display` to `-1`", () => {
            const options = new ScrcpyOptions1_25({});
            options.setListDisplays();
            assert.strictEqual(options.value.displayId, -1);
        });
    });
});
