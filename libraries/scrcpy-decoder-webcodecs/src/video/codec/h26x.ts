import type {
    ScrcpyMediaStreamDataPacket,
    ScrcpyMediaStreamPacket,
} from "@yume-chan/scrcpy";

import type { CodecDecoder } from "./type.js";

export abstract class H26xDecoder implements CodecDecoder {
    #decoder: VideoDecoder;

    #config: (VideoDecoderConfig & { raw: Uint8Array }) | undefined;
    #configured = false;

    constructor(decoder: VideoDecoder) {
        this.#decoder = decoder;
    }

    abstract configure(data: Uint8Array): VideoDecoderConfig;

    #configureAndDecodeFirstKeyframe(
        config: VideoDecoderConfig & { raw: Uint8Array },
        packet: ScrcpyMediaStreamDataPacket,
    ) {
        this.#decoder.configure(config);
        this.#configured = true;

        // For H.264 and H.265, when the stream is in Annex B format
        // (which Scrcpy uses, as Android MediaCodec produces),
        // configuration data needs to be combined with the first frame data.
        // https://www.w3.org/TR/webcodecs-avc-codec-registration/#encodedvideochunk-type
        const { raw } = config;
        const data = new Uint8Array(raw.length + packet.data.length);
        data.set(raw, 0);
        data.set(packet.data, raw.length);

        this.#decoder.decode(
            new EncodedVideoChunk({
                type: "key",
                timestamp: 0,
                data,
            }),
        );
    }

    decode(packet: ScrcpyMediaStreamPacket): void {
        if (packet.type === "configuration") {
            this.#config = {
                ...this.configure(packet.data),
                raw: packet.data,
            };
            this.#configured = false;
            return;
        }

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
                this.#configureAndDecodeFirstKeyframe(this.#config, packet);
                return;
            }

            if (!this.#configured) {
                this.#configureAndDecodeFirstKeyframe(this.#config, packet);
                return;
            }
        }

        if (!this.#configured) {
            if (packet.keyframe === undefined) {
                // Scrcpy <1.23 doesn't send `keyframe` flag
                // Infer the first frame after configuration as keyframe
                // (`VideoDecoder` will throw error if it's not)
                this.#configureAndDecodeFirstKeyframe(this.#config, packet);
                return;
            }

            throw new Error("Expect a keyframe but got a delta frame");
        }

        this.#decoder.decode(
            new EncodedVideoChunk({
                // Treat `undefined` as `key`, otherwise won't decode.
                type: packet.keyframe === false ? "delta" : "key",
                timestamp: 0,
                data: packet.data,
            }),
        );
    }
}
