import type { ScrcpyMediaStreamPacket } from "@yume-chan/scrcpy";

import type { CodecDecoder } from "./type.js";

export abstract class H26xDecoder implements CodecDecoder {
    #config: Uint8Array | undefined;
    #decoder: VideoDecoder;

    constructor(decoder: VideoDecoder) {
        this.#decoder = decoder;
    }

    abstract configure(data: Uint8Array): void;

    decode(packet: ScrcpyMediaStreamPacket): void {
        if (packet.type === "configuration") {
            this.#config = packet.data;
            this.configure(packet.data);
            return;
        }

        // For H.264 and H.265, when the stream is in Annex B format
        // (which Scrcpy uses, as Android MediaCodec produces),
        // configuration data needs to be combined with the first frame data.
        // https://www.w3.org/TR/webcodecs-avc-codec-registration/#encodedvideochunk-type
        let data: Uint8Array;
        if (this.#config !== undefined) {
            data = new Uint8Array(this.#config.length + packet.data.length);
            data.set(this.#config, 0);
            data.set(packet.data, this.#config.length);
            this.#config = undefined;
        } else {
            data = packet.data;
        }

        this.#decoder.decode(
            new EncodedVideoChunk({
                // Treat `undefined` as `key`, otherwise won't decode.
                type: packet.keyframe === false ? "delta" : "key",
                timestamp: 0,
                data,
            }),
        );
    }
}
