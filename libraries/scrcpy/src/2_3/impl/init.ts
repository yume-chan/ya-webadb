import type { PrevImpl } from "./prev.js";

export interface Init<TVideo extends boolean>
    extends Omit<PrevImpl.Init<TVideo>, "audioCodec"> {
    audioCodec?: PrevImpl.Init<TVideo>["audioCodec"] | "flac";
}
