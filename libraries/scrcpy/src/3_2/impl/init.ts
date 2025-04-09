import type { PrevImpl } from "./prev.js";

export interface Init<TVideo extends boolean>
    extends Omit<PrevImpl.Init<TVideo>, "audioSource"> {
    audioSource?:
        | PrevImpl.Init<TVideo>["audioSource"]
        | "mic-unprocessed"
        | "mic-camcorder"
        | "mic-voice-recognition"
        | "mic-voice-communication"
        | "voice-call"
        | "voice-call-uplink"
        | "voice-call-downlink"
        | "voice-performance";

    displayImePolicy?: "local" | "fallback" | "hide" | undefined;
}
