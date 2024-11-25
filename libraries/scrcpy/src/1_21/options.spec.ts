import * as assert from "node:assert";
import { describe, it } from "node:test";

import { AndroidAvcProfile } from "../codec/index.js";

import { CodecOptions } from "./impl/index.js";
import { ScrcpyOptions1_21 } from "./options.js";

describe("ScrcpyOptions1_21", () => {
    describe("serialize", () => {
        it("should serialize empty value", () => {
            const options = new ScrcpyOptions1_21({});
            assert.deepEqual(options.serialize(), []);
        });

        it("should omit primitive values same as default value", () => {
            const options = new ScrcpyOptions1_21({
                // Default value
                sendFrameMeta: true,
            });
            assert.deepEqual(options.serialize(), []);
        });

        it("should omit `ScrcpyOptionValue`s same as default value", () => {
            const options = new ScrcpyOptions1_21({
                codecOptions: new CodecOptions(),
            });
            assert.deepEqual(options.serialize(), []);
        });

        it("should convert ScrcpyOptionValue to string", () => {
            const options = new ScrcpyOptions1_21({
                codecOptions: new CodecOptions({
                    profile: AndroidAvcProfile.High,
                }),
            });
            assert.deepStrictEqual(options.serialize(), [
                "codec_options=profile=8",
            ]);
        });
    });
});
