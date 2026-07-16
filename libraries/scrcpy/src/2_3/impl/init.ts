import type { PrevImpl } from "./prev.js";

export interface Init extends Omit<PrevImpl.Init, "audioCodec"> {
    audioCodec?: PrevImpl.Init["audioCodec"] | "flac";
}
