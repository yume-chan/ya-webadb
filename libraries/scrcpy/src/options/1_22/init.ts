import type { ScrcpyOptionsInit1_21 } from "../1_21.js";
import { SCRCPY_OPTIONS_DEFAULT_1_21 } from "../1_21.js";

export interface ScrcpyOptionsInit1_22 extends ScrcpyOptionsInit1_21 {
    downsizeOnError?: boolean;

    /**
     * Send device name and size at start of video stream.
     *
     * @default true
     */
    sendDeviceMeta?: boolean;

    /**
     * Send a `0` byte on start of video stream to detect connection issues
     *
     * @default true
     */
    sendDummyByte?: boolean;
}

export const SCRCPY_OPTIONS_DEFAULT_1_22 = {
    ...SCRCPY_OPTIONS_DEFAULT_1_21,
    downsizeOnError: true,
    sendDeviceMeta: true,
    sendDummyByte: true,
} as const satisfies Required<ScrcpyOptionsInit1_22>;
