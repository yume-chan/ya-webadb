import type { PrevImpl } from "./prev.js";

export interface Init extends PrevImpl.Init {
    downsizeOnError?: boolean | undefined;

    /**
     * Send device name and size at start of video stream.
     *
     * @default true
     */
    sendDeviceMeta?: boolean | undefined;

    /**
     * Send a `0` byte on start of video stream to detect connection issues
     *
     * @default true
     */
    sendDummyByte?: boolean | undefined;
}
