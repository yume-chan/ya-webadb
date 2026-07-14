import type { PrevImpl } from "./prev.js";

export interface Init extends Omit<PrevImpl.Init, "audioSource"> {
    audioSource?:
        | PrevImpl.Init["audioSource"]
        | "mic-unprocessed"
        | "mic-camcorder"
        | "mic-voice-recognition"
        | "mic-voice-communication"
        | "voice-call"
        | "voice-call-uplink"
        | "voice-call-downlink"
        | "voice-performance"
        | undefined;

    displayImePolicy?: "local" | "fallback" | "hide" | undefined;
}
