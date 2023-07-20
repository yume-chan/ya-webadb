import { describe, expect, it } from "@jest/globals";

import { ScrcpyOptions2_0 } from "./2_0.js";

describe("ScrcpyOptions2_0", () => {
    describe("setListDisplays", () => {
        it("should set `listDisplays` to `true`", () => {
            const options = new ScrcpyOptions2_0({});
            options.setListDisplays();
            expect(options.value.listDisplays).toBe(true);
        });
    });

    describe("setListEncoders", () => {
        it("should set `listEncoders` to `true`", () => {
            const options = new ScrcpyOptions2_0({});
            options.setListEncoders();
            expect(options.value.listEncoders).toBe(true);
        });
    });
});
