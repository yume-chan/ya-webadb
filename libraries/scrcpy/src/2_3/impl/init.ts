import type { PrevImpl } from "./prev.js";

export interface Init extends Omit<PrevImpl.Init, "audioCodec"> {
    audioCodec?: "raw" | "opus" | "aac" | "flac";
}
