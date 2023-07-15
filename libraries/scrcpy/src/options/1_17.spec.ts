import { describe, expect, it } from "@jest/globals";

import { ScrcpyOptions1_17 } from "./1_17.js";

describe("ScrcpyOptions1_17", () => {
    it("should share `value` with `base`", () => {
        const options = new ScrcpyOptions1_17({});
        expect(options.value).toBe(options["_base"].value);
    });

    describe("setListDisplays", () => {
        it("should set `displayId` to `-1`", () => {
            const options = new ScrcpyOptions1_17({});
            options.setListDisplays();
            expect(options.value.displayId).toBe(-1);
        });
    });

    describe("setListEncoders", () => {
        it("should set `encoderName` to `_`", () => {
            const options = new ScrcpyOptions1_17({});
            options.setListEncoders();
            expect(options.value.encoderName).toBe("_");
        });
    });
});
