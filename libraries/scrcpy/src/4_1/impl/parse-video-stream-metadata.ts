import { ScrcpyVideoCodecId } from "../../video/index.js";

import type { Init } from "./init.js";

export function parseVideoCodecOption(
    codec: Exclude<Init["videoCodec"], undefined>,
): ScrcpyVideoCodecId {
    switch (codec) {
        case "h264":
            return ScrcpyVideoCodecId.H264;
        case "h265":
            return ScrcpyVideoCodecId.H265;
        case "av1":
            return ScrcpyVideoCodecId.Av1;
        case "vp8":
            return ScrcpyVideoCodecId.Vp8;
        case "vp9":
            return ScrcpyVideoCodecId.Vp9;
        default:
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            throw new Error(`Unknown video codec: ${codec}`);
    }
}
