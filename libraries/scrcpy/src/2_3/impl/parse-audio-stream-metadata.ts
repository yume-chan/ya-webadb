import { ScrcpyAudioCodec } from "../../base/index.js";

import type { Init } from "./init.js";

export function parseAudioMetadataCodec(codec: number): ScrcpyAudioCodec {
    switch (codec) {
        case ScrcpyAudioCodec.Raw.metadataValue:
            return ScrcpyAudioCodec.Raw;
        case ScrcpyAudioCodec.Opus.metadataValue:
            return ScrcpyAudioCodec.Opus;
        case ScrcpyAudioCodec.Aac.metadataValue:
            return ScrcpyAudioCodec.Aac;
        case ScrcpyAudioCodec.Flac.metadataValue:
            return ScrcpyAudioCodec.Flac;
        default:
            throw new Error(`Unknown audio codec metadata value: ${codec}`);
    }
}

export function parseAudioCodecOption(
    audioCodec: Exclude<Init["audioCodec"], undefined>,
): ScrcpyAudioCodec {
    switch (audioCodec) {
        case "raw":
            return ScrcpyAudioCodec.Raw;
        case "opus":
            return ScrcpyAudioCodec.Opus;
        case "aac":
            return ScrcpyAudioCodec.Aac;
        case "flac":
            return ScrcpyAudioCodec.Flac;
        default:
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            throw new Error(`Unknown audio codec: ${audioCodec}`);
    }
}
