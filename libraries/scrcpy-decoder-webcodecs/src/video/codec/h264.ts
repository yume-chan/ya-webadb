import { H264 } from "@yume-chan/media-codec";

import { H26xDecoder } from "./h26x.js";
import type { CodecDecoder } from "./type.js";

export class H264Decoder extends H26xDecoder {
    override configure(data: Uint8Array): CodecDecoder.Config {
        const configuration = H264.parseConfiguration(data);

        return {
            codec: H264.toCodecString(configuration),
            codedHeight: configuration.croppedHeight,
            codedWidth: configuration.croppedWidth,
        };
    }
}
