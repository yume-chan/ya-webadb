import { getUint32LittleEndian } from "@yume-chan/no-data-view";
import { h265ParseConfiguration } from "@yume-chan/scrcpy";

import { H26xDecoder } from "./h26x.js";
import type { CodecDecoderOptions } from "./type.js";
import { hexDigits } from "./utils.js";

export class H265Decoder extends H26xDecoder {
    #decoder: VideoDecoder;
    #updateSize: (width: number, height: number) => void;
    #options: CodecDecoderOptions | undefined;

    constructor(
        decoder: VideoDecoder,
        updateSize: (width: number, height: number) => void,
        options?: CodecDecoderOptions,
    ) {
        super(decoder);
        this.#decoder = decoder;
        this.#updateSize = updateSize;
        this.#options = options;
    }

    override configure(data: Uint8Array): void {
        const {
            generalProfileSpace,
            generalProfileIndex,
            generalProfileCompatibilitySet,
            generalTierFlag,
            generalLevelIndex,
            generalConstraintSet,
            croppedWidth,
            croppedHeight,
        } = h265ParseConfiguration(data);

        this.#updateSize(croppedWidth, croppedHeight);

        const codec = [
            "hev1",
            ["", "A", "B", "C"][generalProfileSpace]! +
                generalProfileIndex.toString(),
            hexDigits(getUint32LittleEndian(generalProfileCompatibilitySet, 0)),
            (generalTierFlag ? "H" : "L") + generalLevelIndex.toString(),
            ...Array.from(generalConstraintSet, hexDigits),
        ].join(".");
        this.#decoder.configure({
            codec,
            // Microsoft Edge requires explicit size to work
            codedWidth: croppedWidth,
            codedHeight: croppedHeight,
            hardwareAcceleration:
                this.#options?.hardwareAcceleration ?? "no-preference",
            optimizeForLatency: true,
        });
    }
}
