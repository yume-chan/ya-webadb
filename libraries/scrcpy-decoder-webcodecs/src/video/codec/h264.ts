import { H264 } from "@yume-chan/media-codec";

import { H26xTransformStream } from "./h26x.js";

export class H264TransformStream extends H26xTransformStream {
    override configure(data: Uint8Array): H26xTransformStream.Config {
        const configuration = H264.parseConfiguration(data);

        return {
            codec: H264.toCodecString(configuration),
            codedHeight: configuration.croppedHeight,
            codedWidth: configuration.croppedWidth,
        };
    }
}
