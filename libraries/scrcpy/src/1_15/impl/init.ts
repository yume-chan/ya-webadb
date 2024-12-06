import type { ScrcpyOptionValue } from "../../base/index.js";

export const VideoOrientation = {
    Unlocked: -1,
    Portrait: 0,
    Landscape: 1,
    PortraitFlipped: 2,
    LandscapeFlipped: 3,
} as const;

export type VideoOrientation =
    (typeof VideoOrientation)[keyof typeof VideoOrientation];

export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * If the option you need is not in this type,
 * please file an issue on GitHub.
 */
export interface CodecOptionsInit {
    profile?: number | undefined;
    level?: number | undefined;

    iFrameInterval?: number | undefined;
    maxBframes?: number | undefined;
    repeatPreviousFrameAfter?: number | undefined;
    maxPtsGapToEncoder?: number | undefined;
    intraRefreshPeriod?: number | undefined;
}

function toDashCase(input: string) {
    return input.replace(/([A-Z])/g, "-$1").toLowerCase();
}

const CodecOptionTypes: Partial<
    Record<keyof CodecOptionsInit, "long" | "float" | "string">
> = {
    repeatPreviousFrameAfter: "long",
    maxPtsGapToEncoder: "long",
};

export class CodecOptions implements ScrcpyOptionValue {
    static Empty = /* #__PURE__ */ new CodecOptions();

    options: CodecOptionsInit;

    constructor(options: CodecOptionsInit = {}) {
        for (const [key, value] of Object.entries(options)) {
            if (value === undefined) {
                continue;
            }

            if (typeof value !== "number") {
                throw new Error(
                    `Invalid option value for ${key}: ${String(value)}`,
                );
            }
        }

        this.options = options;
    }

    toOptionValue(): string | undefined {
        const entries = Object.entries(this.options).filter(
            ([, value]) => value !== undefined,
        );

        if (entries.length === 0) {
            return undefined;
        }

        return entries
            .map(([key, value]) => {
                let result = toDashCase(key);

                const type = CodecOptionTypes[key as keyof CodecOptionsInit];
                if (type) {
                    result += `:${type}`;
                }

                result += `=${value}`;
                return result;
            })
            .join(",");
    }
}

export namespace CodecOptions {
    export type Init = CodecOptionsInit;
}

export class Crop implements ScrcpyOptionValue {
    width: number;
    height: number;
    x: number;
    y: number;

    constructor(width: number, height: number, x: number, y: number) {
        this.width = width;
        this.height = height;
        this.x = x;
        this.y = y;
    }

    toOptionValue(): string | undefined {
        return `${this.width}:${this.height}:${this.x}:${this.y}`;
    }
}

export interface Init {
    logLevel?: LogLevel;

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
    lockVideoOrientation?: VideoOrientation;

    /**
     * Use ADB forward tunnel instead of reverse tunnel.
     *
     * This option is mainly used for working around the bug that on Android <9,
     * ADB daemon can't create reverse tunnels if connected wirelessly (ADB over WiFi).
     *
     * When using `AdbScrcpyClient`, it can detect this situation and enable this option automatically.
     */
    tunnelForward?: boolean;

    crop?: Crop | string | undefined;

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

    codecOptions?: CodecOptions | string | undefined;
}
