import { TransformStream } from "@yume-chan/stream-extra";

import type { CodecTransformStream } from "./type.js";

export class Vp8TransformStream
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
                    controller.enqueue({
                        codec: "vp8",
                        codedWidth: 0,
                        codedHeight: 0,
                    });
                    return;
                }

                controller.enqueue({
                    // AV1 was added in Scrcpy 2.0 which must have `keyframe` property.
                    type: packet.keyframe ? "key" : "delta",
                    timestamp: packet.timestamp,
                    data: packet.data,
                });
            },
        });
    }
}
