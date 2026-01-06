import { H265 } from "@yume-chan/media-codec";

import { H26xDecoder } from "./h26x.js";
import type { CodecDecoder } from "./type.js";

export class H265Decoder extends H26xDecoder {
    override configure(data: Uint8Array): CodecDecoder.Config {
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
