import { concatUint8Arrays, TransformStream } from "@yume-chan/stream-extra";

import type { CodecTransformStream } from "./type.js";

export abstract class H26xTransformStream
    extends TransformStream<
        CodecTransformStream.Input,
        CodecTransformStream.Output
    >
    implements CodecTransformStream
{
    #config: Uint8Array | undefined;

    constructor() {
        super({
            transform: (packet, controller) => {
                if (packet.type === "configuration") {
                    this.#config = packet.data;
                    controller.enqueue(this.configure(packet.data));
                    return;
                }

                // For H.264 and H.265, when the stream is in Annex B format
                // (which Scrcpy uses, as Android MediaCodec produces),
                // configuration data needs to be combined with the first frame data.
                // https://www.w3.org/TR/webcodecs-avc-codec-registration/#encodedvideochunk-type
                let data: Uint8Array;
                if (this.#config) {
                    data = concatUint8Arrays([this.#config, packet.data]);
                    this.#config = undefined;
                } else {
                    data = packet.data;
                }

                controller.enqueue(
                    new EncodedVideoChunk({
                        // Treat `undefined` as `key`, otherwise won't decode.
                        type: packet.keyframe === false ? "delta" : "key",
                        timestamp: packet.timestamp,
                        data,
                    }),
                );
            },
        });
    }

    abstract configure(data: Uint8Array): CodecTransformStream.Config;
}
