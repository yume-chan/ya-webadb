import {
    StructDeserializeStream,
    TransformStream,
} from "@yume-chan/stream-extra";

import type { ScrcpyMediaStreamPacket } from "../../base/index.js";

import type { Init } from "./init.js";
import { PrevImpl } from "./prev.js";

export const PtsKeyframe = 1n << 62n;

export function createMediaStreamTransformer(
    options: Pick<Init, "sendFrameMeta">,
): TransformStream<Uint8Array, ScrcpyMediaStreamPacket> {
    // Optimized path for video frames only
    if (!options.sendFrameMeta) {
        return new TransformStream({
            transform(chunk, controller) {
                controller.enqueue({
                    type: "data",
                    data: chunk,
                });
            },
        });
    }

    const deserializeStream = new StructDeserializeStream(
        PrevImpl.MediaStreamRawPacket,
    );
    return {
        writable: deserializeStream.writable,
        readable: deserializeStream.readable.pipeThrough(
            new TransformStream({
                transform(packet, controller) {
                    if (packet.pts === PrevImpl.PtsConfig) {
                        controller.enqueue({
                            type: "configuration",
                            data: packet.data,
                        });
                        return;
                    }

                    if (packet.pts & PtsKeyframe) {
                        controller.enqueue({
                            type: "data",
                            keyframe: true,
                            pts: packet.pts & ~PtsKeyframe,
                            data: packet.data,
                        });
                        return;
                    }

                    controller.enqueue({
                        type: "data",
                        keyframe: false,
                        pts: packet.pts,
                        data: packet.data,
                    });
                },
            }),
        ),
    };
}
