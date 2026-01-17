import { h264ParseConfiguration } from "@yume-chan/scrcpy";

import { H26xDecoder } from "./h26x.js";
import type { CodecDecoderOptions } from "./type.js";
import { hexTwoDigits } from "./utils.js";

export class H264Decoder extends H26xDecoder {
    #updateSize: (width: number, height: number) => void;
    #options: CodecDecoderOptions | undefined;

    constructor(
        decoder: VideoDecoder,
        updateSize: (width: number, height: number) => void,
        options?: CodecDecoderOptions,
    ) {
        super(decoder);
        this.#updateSize = updateSize;
        this.#options = options;
    }

    override configure(data: Uint8Array): VideoDecoderConfig {
        const {
            profileIndex,
            constraintSet,
            levelIndex,
            croppedWidth,
            croppedHeight,
        } = h264ParseConfiguration(data);

        this.#updateSize(croppedWidth, croppedHeight);

        // https://www.rfc-editor.org/rfc/rfc6381#section-3.3
        // ISO Base Media File Format Name Space
        const codec =
            "avc1." +
            hexTwoDigits(profileIndex) +
            hexTwoDigits(constraintSet) +
            hexTwoDigits(levelIndex);
        return {
            codec: codec,
            hardwareAcceleration:
                this.#options?.hardwareAcceleration ?? "no-preference",
            optimizeForLatency: true,
        };
    }
}
