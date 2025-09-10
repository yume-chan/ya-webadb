import type { Init } from "./init.js";
import { PrevImpl } from "./prev.js";

export const Defaults = {
    ...{
        ...PrevImpl.Defaults,
        // Remove obsolete values
        // relies on the minifier to flatten the nested spread
        bitRate: undefined,
        codecOptions: undefined,
        encoderName: undefined,
    },

    scid: undefined,

    videoCodec: "h264",
    videoBitRate: 8000000,
    videoCodecOptions: undefined,
    videoEncoder: undefined,

    audio: true,
    audioCodec: "opus",
    audioBitRate: 128000,
    audioCodecOptions: undefined,
    audioEncoder: undefined,

    listEncoders: false,
    listDisplays: false,
    sendCodecMeta: true,
} as const satisfies Required<Init>;
