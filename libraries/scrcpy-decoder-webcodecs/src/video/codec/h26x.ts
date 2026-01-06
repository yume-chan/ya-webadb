import type {
    ScrcpyMediaStreamDataPacket,
    ScrcpyMediaStreamPacket,
} from "@yume-chan/scrcpy";

import type { CodecDecoder } from "./type.js";

export abstract class H26xDecoder implements CodecDecoder {
    #config: Uint8Array | undefined;
    #parsedConfig: VideoDecoderConfig | undefined;
    #decoder: VideoDecoder;

    constructor(decoder: VideoDecoder) {
        this.#decoder = decoder;
    }

    abstract configure(data: Uint8Array): VideoDecoderConfig;

    #configureAndDecodeFirstKeyframe(packet: ScrcpyMediaStreamDataPacket) {
        this.#decoder.configure(this.#parsedConfig!);

        // For H.264 and H.265, when the stream is in Annex B format
        // (which Scrcpy uses, as Android MediaCodec produces),
        // configuration data needs to be combined with the first frame data.
        // https://www.w3.org/TR/webcodecs-avc-codec-registration/#encodedvideochunk-type
        const data = new Uint8Array(this.#config!.length + packet.data.length);
        data.set(this.#config!, 0);
        data.set(packet.data, this.#config!.length);

        this.#decoder.decode(
            new EncodedVideoChunk({
                // Treat `undefined` as `key`, otherwise won't decode.
                type: packet.keyframe === false ? "delta" : "key",
                timestamp: 0,
                data,
            }),
        );
    }

    decode(packet: ScrcpyMediaStreamPacket): void {
        if (packet.type === "configuration") {
            this.#config = packet.data;
            this.#parsedConfig = this.configure(packet.data);
            return;
        }

        if (packet.keyframe) {
            if (this.#decoder.decodeQueueSize) {
                this.#decoder.reset();
                this.#configureAndDecodeFirstKeyframe(packet);
                return;
            }

            if (this.#decoder.state === "unconfigured") {
                this.#configureAndDecodeFirstKeyframe(packet);
                return;
            }
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
