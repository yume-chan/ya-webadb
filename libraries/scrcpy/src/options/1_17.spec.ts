import { describe, expect, it } from "@jest/globals";

import { ScrcpyOptions1_17 } from "./1_17.js";

describe("ScrcpyOptions1_17", () => {
    it("should share `value` with `base`", () => {
        const options = new ScrcpyOptions1_17({});
        // `setListDisplays` is implemented in `ScrcpyOptions1_16`,
        // but it should modify `value` of `ScrcpyOptions1_17`.
        options.setListDisplays();
        expect(options.value.displayId).toBe(-1);
    });

    describe("setListEncoders", () => {
        it("should set `encoderName` to `_`", () => {
            const options = new ScrcpyOptions1_17({});
            options.setListEncoders();
            expect(options.value.encoderName).toBe("_");
        });
    });
});
