import type { ScrcpyMediaStreamPacket } from "@yume-chan/scrcpy";
import { Av1 } from "@yume-chan/scrcpy";

import type { CodecDecoder, CodecDecoderOptions } from "./type.js";
import { decimalTwoDigits } from "./utils.js";

export class Av1Codec implements CodecDecoder {
    #decoder: VideoDecoder;
    #updateSize: (width: number, height: number) => void;
    #options: CodecDecoderOptions | undefined;

    #config: VideoDecoderConfig | undefined;
    #configured = false;

    constructor(
        decoder: VideoDecoder,
        updateSize: (width: number, height: number) => void,
        options?: CodecDecoderOptions,
    ) {
        this.#decoder = decoder;
        this.#updateSize = updateSize;
        this.#options = options;
    }

    #parseConfig(data: Uint8Array) {
        const parser = new Av1(data);
        const sequenceHeader = parser.searchSequenceHeaderObu();

        if (!sequenceHeader) {
            return;
        }

        const {
            seq_profile: seqProfile,
            seq_level_idx: [seqLevelIdx = 0],
            max_frame_width_minus_1,
            max_frame_height_minus_1,
            color_config: {
                BitDepth,
                mono_chrome: monoChrome,
                subsampling_x: subsamplingX,
                subsampling_y: subsamplingY,
                chroma_sample_position: chromaSamplePosition,
                color_description_present_flag,
            },
        } = sequenceHeader;

        let colorPrimaries: Av1.ColorPrimaries;
        let transferCharacteristics: Av1.TransferCharacteristics;
        let matrixCoefficients: Av1.MatrixCoefficients;
        let colorRange: boolean;
        if (color_description_present_flag) {
            ({
                color_primaries: colorPrimaries,
                transfer_characteristics: transferCharacteristics,
                matrix_coefficients: matrixCoefficients,
                color_range: colorRange,
            } = sequenceHeader.color_config);
        } else {
            colorPrimaries = Av1.ColorPrimaries.Bt709;
            transferCharacteristics = Av1.TransferCharacteristics.Bt709;
            matrixCoefficients = Av1.MatrixCoefficients.Bt709;
            colorRange = false;
        }

        const width = max_frame_width_minus_1 + 1;
        const height = max_frame_height_minus_1 + 1;

        this.#updateSize(width, height);

        const codec = [
            "av01",
            seqProfile.toString(16),
            decimalTwoDigits(seqLevelIdx) +
                (sequenceHeader.seq_tier[0] ? "H" : "M"),
            decimalTwoDigits(BitDepth),
            monoChrome ? "1" : "0",
            (subsamplingX ? "1" : "0") +
                (subsamplingY ? "1" : "0") +
                chromaSamplePosition.toString(),
            decimalTwoDigits(colorPrimaries),
            decimalTwoDigits(transferCharacteristics),
            decimalTwoDigits(matrixCoefficients),
            colorRange ? "1" : "0",
        ].join(".");
        this.#config = {
            codec,
            hardwareAcceleration:
                this.#options?.hardwareAcceleration ?? "no-preference",
            optimizeForLatency: true,
        };
        this.#configured = false;
    }

    decode(packet: ScrcpyMediaStreamPacket): void {
        if (packet.type === "configuration") {
            return;
        }

        this.#parseConfig(packet.data);

        if (!this.#config) {
            throw new Error("Decoder not configured");
        }

        if (packet.keyframe) {
            if (this.#decoder.decodeQueueSize) {
                // If the device is too slow to decode all frames,
                // discard queued frames when next keyframe arrives.
                // (can only do this for keyframes because decoding must start from a keyframe)
                // This limits the maximum latency to 1 keyframe interval
                // (60 frames by default).
                this.#decoder.reset();

                // `reset` also resets the decoder configuration
                // so we need to re-configure it again.
                this.#decoder.configure(this.#config);
                this.#configured = true;
            } else if (!this.#configured) {
                this.#decoder.configure(this.#config);
                this.#configured = true;
            }
        }

        this.#decoder.decode(
            new EncodedVideoChunk({
                // AV1 requires Scrcpy 2.0 where `keyframe` flag must be set
                type: packet.keyframe! ? "key" : "delta",
                timestamp: 0,
                data: packet.data,
            }),
        );
    }
}
