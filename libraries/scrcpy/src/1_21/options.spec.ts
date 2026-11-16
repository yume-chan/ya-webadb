import * as assert from "node:assert";
import { describe, it } from "node:test";

import { DeviceMessageParser } from "../1_15/impl/device-message-parser.js";
import { AndroidAvcProfile } from "../video/index.js";

import {
    CodecOptions,
    SetClipboardControlMessage,
    VideoCodecOptions,
} from "./impl/index.js";
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
                codecOptions: new VideoCodecOptions().setProfile(
                    AndroidAvcProfile.High,
                ),
            });
            assert.deepStrictEqual(options.serialize(), [
                "codec_options=profile=8",
            ]);
        });
    });

    describe("serializeSetClipboardControlMessage", () => {
        it("should serialize sequence zero with an acknowledgment handler", () => {
            const options = new ScrcpyOptions1_21({ control: true });
            const parser = options.createDeviceMessageParser();
            const message = {
                type: 0,
                sequence: 0n,
                paste: false,
                content: "",
            };

            assert.deepStrictEqual(
                options.serializeSetClipboardControlMessage(message, parser),
                SetClipboardControlMessage.serialize(message),
            );
        });

        it("should reject a parser without acknowledgment support", () => {
            const options = new ScrcpyOptions1_21({ control: true });
            const parser = new DeviceMessageParser(true, true);

            assert.throws(() =>
                options.serializeSetClipboardControlMessage(
                    {
                        type: 0,
                        sequence: 0n,
                        paste: false,
                        content: "",
                    },
                    parser,
                ),
            );
        });

        it("should not create a parser when control is disabled", () => {
            const options = new ScrcpyOptions1_21({ control: false });

            assert.throws(() => options.createDeviceMessageParser());
        });
    });
});
