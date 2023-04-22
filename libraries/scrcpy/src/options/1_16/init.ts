import type { CodecOptions } from "./codec-options.js";

export enum ScrcpyLogLevel1_16 {
    Debug = "debug",
    Info = "info",
    Warn = "warn",
    Error = "error",
}

export enum ScrcpyVideoOrientation1_16 {
    Unlocked = -1,
    Portrait = 0,
    Landscape = 1,
    PortraitFlipped = 2,
    LandscapeFlipped = 3,
}

export interface ScrcpyOptionsInit1_16 {
    logLevel?: ScrcpyLogLevel1_16;

    /**
     * The maximum value of both width and height.
     */
    maxSize?: number;

    bitRate?: number;

    /**
     * 0 for unlimited.
     *
     * @default 0
     */
    maxFps?: number;

    /**
     * The orientation of the video stream.
     *
     * It will not keep the device screen in specific orientation,
     * only the captured video will in this orientation.
     */
    lockVideoOrientation?: ScrcpyVideoOrientation1_16;

    /**
     * Use ADB forward tunnel instead of reverse tunnel.
     *
     * This option is mainly used for working around the bug that on Android <9,
     * ADB daemon can't create reverse tunnels if connected wirelessly (ADB over WiFi).
     *
     * When using `AdbScrcpyClient`, it can detect this situation and enable this option automatically.
     */
    tunnelForward?: boolean;

    crop?: string | undefined;

    /**
     * Send PTS so that the client may record properly
     *
     * Note: When `sendFrameMeta: false` is specified,
     * the video stream will not contain `configuration` typed packets,
     * which means it can't be decoded by the companion decoders.
     * It's still possible to record the stream into a file,
     * or to decode it with a more tolerant decoder like FFMpeg.
     *
     * @default true
     */
    sendFrameMeta?: boolean;

    /**
     * @default true
     */
    control?: boolean;

    displayId?: number;

    showTouches?: boolean;

    stayAwake?: boolean;

    codecOptions?: CodecOptions;
}
