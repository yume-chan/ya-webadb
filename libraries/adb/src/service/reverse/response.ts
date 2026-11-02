import { extend, string, struct } from "@yume-chan/struct";

import { AdbReverseError, AdbReverseNotSupportedError } from "./error.js";

/** @internal exported for tests */
export const AdbReverseStringResponse = struct(
    {
        length: string(4),
        content: string({
            field: "length",
            convert(value: string) {
                return Number.parseInt(value, 16);
            },
            back(value) {
                return value.toString(16).padStart(4, "0");
            },
        }),
    },
    { littleEndian: true },
);

/** @internal exported for tests */
export const AdbReverseErrorResponse = extend(
    AdbReverseStringResponse,
    {},
    {
        postDeserialize(value) {
            // https://issuetracker.google.com/issues/37066218
            // ADB on Android <9 can't create reverse tunnels when connected wirelessly (ADB over Wi-Fi),
            // and returns this confusing "more than one device/emulator" error.
            if (value.content === "more than one device/emulator") {
                throw new AdbReverseNotSupportedError();
            } else {
                throw new AdbReverseError(value.content);
            }
        },
    },
);
