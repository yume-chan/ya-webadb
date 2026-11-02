import { decimalTwoDigits, Vp9 } from "@yume-chan/media-codec";
import { TransformStream } from "@yume-chan/stream-extra";

import type { CodecTransformStream } from "./type.js";

export class Vp9TransformStream
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
                    // VP9 doesn't have configuration packet
                    return;
                }

                const { frame_type, Profile, color_config, render_size } =
                    Vp9.parseFrameHeader(packet.data);
                packet.keyframe = frame_type === Vp9.FrameTypeKeyFrame;
                if (
                    color_config &&
                    (render_size.RenderWidth !== this.#width ||
                        render_size.RenderHeight !== this.#height)
                ) {
                    controller.enqueue({
                        codec: [
                            "vp09",
                            decimalTwoDigits(Profile),
                            "10", // level, which doesn't exist in bitstream
                            decimalTwoDigits(color_config.BitDepth),
                        ].join("."),
                        codedWidth: render_size.RenderWidth,
                        codedHeight: render_size.RenderHeight,
                    });

                    this.#width = render_size.RenderWidth;
                    this.#height = render_size.RenderHeight;
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
