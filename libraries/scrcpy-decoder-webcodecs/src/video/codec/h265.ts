import { H265 } from "@yume-chan/media-codec";

import { H26xDecoder } from "./h26x.js";

export class H265Decoder extends H26xDecoder {
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
        const configuration = H265.parseConfiguration(data);

        this.#updateSize(
            configuration.croppedWidth,
            configuration.croppedHeight,
        );

        this.#decoder.configure({
            codec: H265.toCodecString(configuration),
            // Microsoft Edge on Windows requires explicit size,
            // otherwise it returns frames in incorrect size.
            // And it needs cropped size, as opposed to the option name.
            codedWidth: configuration.croppedWidth,
            codedHeight: configuration.croppedHeight,
            optimizeForLatency: true,
        });
    }
}
