import type { PrevImpl } from "./prev.js";

export interface Init<TVideo extends boolean> extends PrevImpl.Init {
    video?: TVideo;
    audioSource?: "output" | "mic";
}
