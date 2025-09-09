import { H264 } from "@yume-chan/media-codec";

import { H26xDecoder } from "./h26x.js";

export class H264Decoder extends H26xDecoder {
    #decoder: VideoDecoder;
    #updateSize: (width: number, height: number) => void;

    constructor(
        decoder: VideoDecoder,
        updateSize: (width: number, height: number) => void,
    ) {
        super(decoder);
        this.#decoder = decoder;
        this.#updateSize = updateSize;
    }

    override configure(data: Uint8Array): void {
        const configuration = H264.parseConfiguration(data);

        this.#updateSize(
            configuration.croppedWidth,
            configuration.croppedHeight,
        );

        this.#decoder.configure({
            codec: H264.toCodecString(configuration),
            optimizeForLatency: true,
        });
    }
}
