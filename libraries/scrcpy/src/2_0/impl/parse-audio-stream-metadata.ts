import { getUint32BigEndian } from "@yume-chan/no-data-view";
import type { ReadableStream } from "@yume-chan/stream-extra";
import {
    BufferedReadableStream,
    PushReadableStream,
} from "@yume-chan/stream-extra";

import type { Init } from "../../2_3/impl/init.js";
import type { ScrcpyAudioStreamMetadata } from "../../base/index.js";
import { ScrcpyAudioCodec } from "../../base/index.js";

export async function parseAudioStreamMetadata(
    stream: ReadableStream<Uint8Array>,
    options: Pick<Required<Init<boolean>>, "sendCodecMeta" | "audioCodec">,
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

    if (options.sendCodecMeta) {
        let codec: ScrcpyAudioCodec;
        switch (codecMetadataValue) {
            case ScrcpyAudioCodec.Raw.metadataValue:
                codec = ScrcpyAudioCodec.Raw;
                break;
            case ScrcpyAudioCodec.Opus.metadataValue:
                codec = ScrcpyAudioCodec.Opus;
                break;
            case ScrcpyAudioCodec.Aac.metadataValue:
                codec = ScrcpyAudioCodec.Aac;
                break;
            case ScrcpyAudioCodec.Flac.metadataValue:
                codec = ScrcpyAudioCodec.Flac;
                break;
            default:
                throw new Error(
                    `Unknown audio codec metadata value: ${codecMetadataValue}`,
                );
        }
        return {
            type: "success",
            codec,
            stream: buffered.release(),
        };
    }

    // Infer codec from `audioCodec` option
    let codec: ScrcpyAudioCodec;
    switch (options.audioCodec as string) {
        case "raw":
            codec = ScrcpyAudioCodec.Raw;
            break;
        case "opus":
            codec = ScrcpyAudioCodec.Opus;
            break;
        case "aac":
            codec = ScrcpyAudioCodec.Aac;
            break;
        case "flac":
            codec = ScrcpyAudioCodec.Flac;
            break;
        default:
            throw new Error(
                `Unknown audio codec metadata value: ${codecMetadataValue}`,
            );
    }

    return {
        type: "success",
        codec,
        stream: new PushReadableStream<Uint8Array>(async (controller) => {
            // Put the first 4 bytes back
            await controller.enqueue(buffer);

            const stream = buffered.release();
            const reader = stream.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                await controller.enqueue(value);
            }
        }),
    };
}
