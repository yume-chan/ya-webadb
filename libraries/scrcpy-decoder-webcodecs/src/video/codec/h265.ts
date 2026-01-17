import { H265 } from "@yume-chan/media-codec";

import { H26xTransformStream } from "./h26x.js";

export class H265TransformStream extends H26xTransformStream {
    override configure(data: Uint8Array): H26xTransformStream.Config {
        const configuration = H265.parseConfiguration(data);

        return {
            codec: H265.toCodecString(configuration),
            // Microsoft Edge on Windows requires explicit size,
            // otherwise it returns frames in incorrect size.
            // And it needs cropped size, as opposed to the option name.
            codedWidth: configuration.croppedWidth,
            codedHeight: configuration.croppedHeight,
        };
    }
}
