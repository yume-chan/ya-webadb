import { Av1 } from "@yume-chan/media-codec";
import { TransformStream } from "@yume-chan/stream-extra";

import { convertFrameType } from "../utils/frame-type.js";

import type { CodecTransformStream } from "./type.js";

export class Av1TransformStream
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
                    // AV1 decoder doesn't need configuration packets
                    return;
                }

                const parser = new Av1(packet.data);
                const sequenceHeader = parser.searchSequenceHeaderObu();

                if (sequenceHeader) {
                    const width = sequenceHeader.max_frame_width_minus_1 + 1;
                    const height = sequenceHeader.max_frame_height_minus_1 + 1;

                    controller.enqueue({
                        codec: Av1.toCodecString(sequenceHeader),
                        codedWidth: width,
                        codedHeight: height,
                    });
                }

                controller.enqueue({
                    type: convertFrameType(packet.keyframe),
                    timestamp: packet.timestamp,
                    data: packet.data,
                });
            },
        });
    }
}
