import { Av1 } from "@yume-chan/media-codec";
import type { ScrcpyMediaStreamPacket } from "@yume-chan/scrcpy";

import type { CodecDecoder, CodecDecoderOptions } from "./type.js";

export class Av1Codec implements CodecDecoder {
    #decoder: VideoDecoder;
    #updateSize: (width: number, height: number) => void;
    #options: CodecDecoderOptions | undefined;

    constructor(
        decoder: VideoDecoder,
        updateSize: (width: number, height: number) => void,
        options?: CodecDecoderOptions,
    ) {
        this.#decoder = decoder;
        this.#updateSize = updateSize;
        this.#options = options;
    }

    #configure(data: Uint8Array) {
        const parser = new Av1(data);
        const sequenceHeader = parser.searchSequenceHeaderObu();

        if (!sequenceHeader) {
            return;
        }

        const width = sequenceHeader.max_frame_width_minus_1 + 1;
        const height = sequenceHeader.max_frame_height_minus_1 + 1;
        this.#updateSize(width, height);

        this.#decoder.configure({
            codec: Av1.toCodecString(sequenceHeader),
            hardwareAcceleration:
                this.#options?.hardwareAcceleration ?? "no-preference",
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
