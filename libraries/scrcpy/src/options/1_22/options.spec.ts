import { describe, expect, it } from "@jest/globals";

import { ScrcpyOptions1_21 } from "../1_21.js";

import { ScrcpyOptions1_22 } from "./options.js";

describe("ScrcpyOptions1_22", () => {
    it("should return a different scroll controller", () => {
        const controller1_21 = new ScrcpyOptions1_21(
            {}
        ).createScrollController();
        const controller1_22 = new ScrcpyOptions1_22(
            {}
        ).createScrollController();
        expect(controller1_22).not.toBe(controller1_21);
    });
});
