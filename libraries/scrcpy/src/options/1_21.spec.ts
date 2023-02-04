import { describe, expect, it } from "@jest/globals";

import { AndroidCodecProfile } from "../codec.js";

import { ScrcpyOptions1_21 } from "./1_21.js";

import { CodecOptions } from "./index.js";

describe("ScrcpyOptions1_21", () => {
    describe("serializeServerArguments", () => {
        it("should serialize empty value", () => {
            const options = new ScrcpyOptions1_21({});
            expect(options.serializeServerArguments()).toEqual([]);
        });

        it("should omit default values", () => {
            const options = new ScrcpyOptions1_21({
                // Default value
                sendFrameMeta: true,
            });
            expect(options.serializeServerArguments()).toEqual([]);
        });

        it("should convert ScrcpyOptionValue to string", () => {
            const options = new ScrcpyOptions1_21({
                codecOptions: new CodecOptions({
                    profile: AndroidCodecProfile.High,
                }),
            });
            expect(options.serializeServerArguments()).toEqual([
                "codec_options=profile=8",
            ]);
        });
    });
});
