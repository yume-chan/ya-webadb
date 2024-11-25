import type { Init } from "./init.js";
import { InstanceId } from "./init.js";
import { PrevImpl } from "./prev.js";

export const Defaults = /* #__PURE__ */ (() =>
    ({
        ...PrevImpl.Defaults,
        scid: InstanceId.NONE,

        videoCodec: "h264",
        videoBitRate: 8000000,
        videoCodecOptions: PrevImpl.CodecOptions.Empty,
        videoEncoder: undefined,

        audio: true,
        audioCodec: "opus",
        audioBitRate: 128000,
        audioCodecOptions: PrevImpl.CodecOptions.Empty,
        audioEncoder: undefined,

        listEncoders: false,
        listDisplays: false,
        sendCodecMeta: true,
    }) as const satisfies Required<Init>)();
