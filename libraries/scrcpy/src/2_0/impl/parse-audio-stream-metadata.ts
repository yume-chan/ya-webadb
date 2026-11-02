import { getUint32BigEndian } from "@yume-chan/no-data-view";
import type { ReadableStream } from "@yume-chan/stream-extra";
import {
    BufferedReadableStream,
    PushReadableStream,
} from "@yume-chan/stream-extra";

import type { Init } from "../../2_3/impl/init.js";
import type { ScrcpyAudioStreamMetadata } from "../../base/index.js";
import { ScrcpyAudioCodec } from "../../base/index.js";

export function parseAudioMetadataCodec(codec: number): ScrcpyAudioCodec {
    switch (codec) {
        case ScrcpyAudioCodec.Raw.metadataValue:
            return ScrcpyAudioCodec.Raw;
        case ScrcpyAudioCodec.Opus.metadataValue:
            return ScrcpyAudioCodec.Opus;
        case ScrcpyAudioCodec.Aac.metadataValue:
            return ScrcpyAudioCodec.Aac;
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
        default:
            throw new Error(`Unknown audio codec: ${audioCodec}`);
    }
}

export async function parseAudioStreamMetadata(
    stream: ReadableStream<Uint8Array>,
    sendCodecMeta: Exclude<Init["sendCodecMeta"], undefined>,
    parseMetadataCodec: (codec: number) => ScrcpyAudioCodec,
    fallbackCodec: ScrcpyAudioCodec,
): Promise<ScrcpyAudioStreamMetadata> {
    const buffered = new BufferedReadableStream(stream);

    const buffer = await buffered.readExactly(4);
    // Treat it as a 32-bit number for simpler comparisons
    const codecMetadataValue = getUint32BigEndian(buffer, 0);
    // Server will send `0x00_00_00_00` and `0x00_00_00_01` even if `sendCodecMeta` is false
    switch (codecMetadataValue) {
        case 0x00_00_00_00:
            return {
                type: "disabled",
            };
        case 0x00_00_00_01:
            return {
                type: "errored",
            };
    }

    if (sendCodecMeta) {
        return {
            type: "success",
            codec: parseMetadataCodec(codecMetadataValue),
            stream: buffered.release(),
        };
    }

    return {
        type: "success",
        codec: fallbackCodec,
        stream: new PushReadableStream<Uint8Array>(async (controller) => {
            // Put the first 4 bytes back
            await controller.enqueue(buffer);

            const stream = buffered.release();

            for await (const chunk of stream) {
                await controller.enqueue(chunk);
            }
        }),
    };
}
