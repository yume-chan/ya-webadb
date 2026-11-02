import * as assert from "node:assert";
import { describe, it } from "node:test";

import { OverlayDisplay } from "./overlay-display.js";

describe("OverlayDisplay", () => {
    describe("SETTING_FORMAT", () => {
        // values are from https://cs.android.com/android/platform/superproject/+/master:frameworks/base/packages/SettingsLib/res/values/arrays.xml;l=468;drc=60c1d392225bc6e1601693c7d5cfdf1d7f510015

        it("should parse 0 device", () => {
            assert.deepStrictEqual(
                OverlayDisplay.SETTING_FORMAT.parse({
                    value: "",
                    position: 0,
                }),
                [],
            );
        });

        it("should parse 1 mode", () => {
            assert.deepStrictEqual(
                OverlayDisplay.SETTING_FORMAT.parse({
                    value: "720x480/142",
                    position: 0,
                }),
                [
                    {
                        flags: [],
                        modes: [
                            {
                                density: 142,
                                height: 480,
                                width: 720,
                            },
                        ],
                    },
                ],
            );
        });

        it("should parse 2 modes", () => {
            assert.deepStrictEqual(
                OverlayDisplay.SETTING_FORMAT.parse({
                    value: "1920x1080/320|3840x2160/640",
                    position: 0,
                }),
                [
                    {
                        flags: [],
                        modes: [
                            {
                                density: 320,
                                height: 1080,
                                width: 1920,
                            },
                            {
                                density: 640,
                                height: 2160,
                                width: 3840,
                            },
                        ],
                    },
                ],
            );
        });

        it("should parse 2 device", () => {
            assert.deepStrictEqual(
                OverlayDisplay.SETTING_FORMAT.parse({
                    value: "1280x720/213;1920x1080/320",
                    position: 0,
                }),
                [
                    {
                        flags: [],
                        modes: [
                            {
                                density: 213,
                                height: 720,
                                width: 1280,
                            },
                        ],
                    },
                    {
                        flags: [],
                        modes: [
                            {
                                density: 320,
                                height: 1080,
                                width: 1920,
                            },
                        ],
                    },
                ],
            );
        });

        it("should parse flags", () => {
            assert.deepStrictEqual(
                OverlayDisplay.SETTING_FORMAT.parse({
                    value: "1920x1080/320|3840x2160/640,secure",
                    position: 0,
                }),
                [
                    {
                        flags: ["secure"],
                        modes: [
                            {
                                density: 320,
                                height: 1080,
                                width: 1920,
                            },
                            {
                                density: 640,
                                height: 2160,
                                width: 3840,
                            },
                        ],
                    },
                ],
            );
        });
    });
});
