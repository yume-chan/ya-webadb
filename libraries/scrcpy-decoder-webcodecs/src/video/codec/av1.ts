import type { ScrcpyMediaStreamPacket } from "@yume-chan/scrcpy";
import { Av1 } from "@yume-chan/scrcpy";

import type { CodecDecoder } from "./type.js";
import { decimalTwoDigits } from "./utils.js";

export class Av1Codec implements CodecDecoder {
    #decoder: VideoDecoder;
    #updateSize: (width: number, height: number) => void;

    constructor(
        decoder: VideoDecoder,
        updateSize: (width: number, height: number) => void,
    ) {
        this.#decoder = decoder;
        this.#updateSize = updateSize;
    }

    #configure(data: Uint8Array) {
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
        this.#decoder.configure({
            codec,
            optimizeForLatency: true,
        });
    }

    decode(packet: ScrcpyMediaStreamPacket): undefined {
        if (packet.type === "configuration") {
            return;
        }

        this.#configure(packet.data);
        this.#decoder.decode(
            new EncodedVideoChunk({
                // Treat `undefined` as `key`, otherwise it won't decode.
                type: packet.keyframe === false ? "delta" : "key",
                // HACK: `timestamp` is only used as a marker to skip paused frames,
                // so it's fine as long as we can differentiate `0` from non-zeros.
                // Hope `packet.pts` won't be too large to lose precision.
                timestamp: packet.pts !== undefined ? Number(packet.pts) : 1,
                data: packet.data,
            }),
        );
    }
}
