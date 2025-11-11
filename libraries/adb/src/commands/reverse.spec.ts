import * as assert from "node:assert";
import { describe, it } from "node:test";

import { encodeUtf8, Uint8ArrayExactReadable } from "@yume-chan/struct";

import { AdbReverseErrorResponse } from "./reverse.js";

describe("AdbReverseErrorResponse", () => {
    it("should throw AdbReverseNotSupportedError", () => {
        assert.throws(
            () =>
                AdbReverseErrorResponse.deserialize(
                    new Uint8ArrayExactReadable(
                        encodeUtf8("001Dmore than one device/emulator"),
                    ),
                ),
            /ADB reverse tunnel is not supported on this device when connected wirelessly./,
        );
    });
});
