import * as assert from "node:assert";
import { describe, it } from "node:test";

import { ScrcpyOptions1_21 } from "../1_21/index.js";

import { ScrcpyOptions1_22 } from "./options.js";

describe("ScrcpyOptions1_22", () => {
    it("should return a different scroll controller", () => {
        const controller1_21 = new ScrcpyOptions1_21(
            {},
        ).createScrollController();
        const controller1_22 = new ScrcpyOptions1_22(
            {},
        ).createScrollController();
        assert.notStrictEqual(controller1_22, controller1_21);
    });
});
