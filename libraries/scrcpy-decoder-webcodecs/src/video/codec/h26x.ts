import { TransformStream } from "@yume-chan/stream-extra";

import type { CodecTransformStream } from "./type.js";

export abstract class H26xTransformStream
    extends TransformStream<
        CodecTransformStream.Input,
        CodecTransformStream.Output
    >
    implements CodecTransformStream
{
    constructor() {
        super({
            transform: (packet, controller) => {
                if (packet.type === "configuration") {
                    controller.enqueue(this.#configure(packet.data));
                    return;
                }

                controller.enqueue({
                    type: this.convertFrameType(packet.keyframe, packet.data),
                    timestamp: packet.timestamp,
                    data: packet.data,
                });
            },
        });
    }

    abstract convertFrameType(
        keyframe: boolean | undefined,
        data: Uint8Array,
    ): EncodedVideoChunkType;

    abstract configure(data: Uint8Array): H26xTransformStream.Config;

    #configure(data: Uint8Array): CodecTransformStream.Config {
        return {
            ...this.configure(data),
            // For H.264 and H.265, when the stream is in Annex B format
            // (which Scrcpy uses, as Android MediaCodec produces),
            // configuration data needs to be combined with the first frame data.
            // https://www.w3.org/TR/webcodecs-avc-codec-registration/#encodedvideochunk-type
            raw: data,
        };
    }
}

export namespace H26xTransformStream {
    export type Config = Omit<CodecTransformStream.Config, "raw">;
}
