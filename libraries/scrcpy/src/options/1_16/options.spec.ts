import { describe, expect, it } from "@jest/globals";

import { ScrcpyOptions1_16 } from "./options.js";

describe("ScrcpyOptions1_16", () => {
    describe("serialize", () => {
        it("should return `-` for default values", () => {
            expect(new ScrcpyOptions1_16({}).serialize()).toEqual([
                "debug",
                "0",
                "8000000",
                "0",
                "-1",
                "false",
                "-",
                "true",
                "true",
                "0",
                "false",
                "false",
                "-",
            ]);
        });
    });

    describe("setListDisplays", () => {
        it("should set `display` to `-1`", () => {
            const options = new ScrcpyOptions1_16({});
            options.setListDisplays();
            expect(options.value.displayId).toBe(-1);
        });
    });
});
