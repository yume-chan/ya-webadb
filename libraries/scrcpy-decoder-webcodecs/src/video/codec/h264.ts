import { H264 } from "@yume-chan/media-codec";

import { H26xTransformStream } from "./h26x.js";

export class H264TransformStream extends H26xTransformStream {
    override convertFrameType(
        keyframe: boolean | undefined,
        data: Uint8Array,
    ): EncodedVideoChunkType {
        // Older versions of Scrcpy doesn't have `keyframe` property,
        // so detect it from the frame data.
        return (keyframe ?? H264.containsKeyFrame(data)) ? "key" : "delta";
    }

    override configure(data: Uint8Array): H26xTransformStream.Config {
        const configuration = H264.parseConfiguration(data);

        return {
            codec: H264.toCodecString(configuration),
            codedHeight: configuration.croppedHeight,
            codedWidth: configuration.croppedWidth,
        };
    }
}
