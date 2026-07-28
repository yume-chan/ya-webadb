import { Vp8 } from "@yume-chan/media-codec";
import { TransformStream } from "@yume-chan/stream-extra";

import type { CodecTransformStream } from "./type.js";

export class Vp8TransformStream
    extends TransformStream<
        CodecTransformStream.Input,
        CodecTransformStream.Output
    >
    implements CodecTransformStream
{
    #width = 0;
    #height = 0;

    constructor() {
        super({
            transform: (packet, controller) => {
                if (packet.type === "configuration") {
                    // VP8 doesn't have configuration packet
                    return;
                }

                if (packet.keyframe !== false) {
                    const { key_frame, width, height } = Vp8.parseFrameTag(
                        packet.data,
                    );
                    packet.keyframe = key_frame;
                    if (
                        key_frame &&
                        (width !== this.#width || height !== this.#height)
                    ) {
                        controller.enqueue({
                            codec: "vp8",
                            codedWidth: width,
                            codedHeight: height,
                        });

                        this.#width = width;
                        this.#height = height;
                    }
                }

                controller.enqueue({
                    type: packet.keyframe ? "key" : "delta",
                    timestamp: packet.timestamp,
                    data: packet.data,
                });
            },
        });
    }
}
