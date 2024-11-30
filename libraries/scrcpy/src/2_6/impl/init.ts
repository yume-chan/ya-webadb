import type { PrevImpl } from "./prev.js";

export interface Init extends Omit<PrevImpl.Init, "audioSource"> {
    audioSource?: PrevImpl.Init["audioSource"] | "playback";
    audioDup?: boolean;
}
