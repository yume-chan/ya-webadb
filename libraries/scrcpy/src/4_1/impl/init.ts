import type { PrevImpl } from "./prev.js";

export interface Init extends Omit<PrevImpl.Init, "videoCodec"> {
    videoCodec: PrevImpl.Init["videoCodec"] | "vp8" | "vp9";

    ignoreVideoEncoderConstraints?: boolean | undefined;
}
