import { describe, expect, it } from "@jest/globals";

import { AndroidAvcProfile } from "../codec/index.js";

import { ScrcpyOptions1_21 } from "./1_21.js";

import { CodecOptions } from "./index.js";

describe("ScrcpyOptions1_21", () => {
    describe("serialize", () => {
        it("should serialize empty value", () => {
            const options = new ScrcpyOptions1_21({});
            expect(options.serialize()).toEqual([]);
        });

        it("should omit primitive values same as default value", () => {
            const options = new ScrcpyOptions1_21({
                // Default value
                sendFrameMeta: true,
            });
            expect(options.serialize()).toEqual([]);
        });

        it("should omit `ScrcpyOptionValue`s same as default value", () => {
            const options = new ScrcpyOptions1_21({
                codecOptions: new CodecOptions(),
            });
            expect(options.serialize()).toEqual([]);
        });

        it("should convert ScrcpyOptionValue to string", () => {
            const options = new ScrcpyOptions1_21({
                codecOptions: new CodecOptions({
                    profile: AndroidAvcProfile.High,
                }),
            });
            expect(options.serialize()).toEqual(["codec_options=profile=8"]);
        });
    });
});
